import * as pty from "node-pty";
import process from "node:process";
import { WebSocket, type RawData } from "ws";

type AgentId = "codex" | "claude";

interface AgentDefinition {
  id: AgentId;
  label: string;
  command: string;
}

export interface TerminalConnectionOptions {
  resolveTaskCwd?: (taskId: string) => string;
}

interface TerminalSession {
  agent: AgentDefinition;
  clients: Set<WebSocket>;
  cleanupTimer: NodeJS.Timeout | null;
  cwd: string;
  detachedTtlMs: number;
  key: string;
  outputBuffer: string;
  pendingSize: { cols: number; rows: number };
  ptyProcess: pty.IPty | null;
  replayBufferBytes: number;
}

const terminalAgents: Record<AgentId, AgentDefinition> = {
  codex: {
    id: "codex",
    label: "Codex",
    command: "codex"
  },
  claude: {
    id: "claude",
    label: "Claude Code",
    command: "claude"
  }
};

const resizePattern = /^\x1b\[RESIZE:(\d+);(\d+)\]$/;
const closeCommand = "\x1b[TERMINAL:CLOSE]";
const terminalSessions = new Map<string, TerminalSession>();
const defaultDetachedTtlMs = 30 * 60 * 1000;
const defaultReplayBufferBytes = 256 * 1024;

export interface TerminalSessionConfig {
  detachedTtlMs: number;
  replayBufferBytes: number;
}

export function listTerminalAgents() {
  return Object.values(terminalAgents);
}

export function handleTerminalConnection(
  ws: WebSocket,
  url: URL,
  options: TerminalConnectionOptions = {}
) {
  const agentParam = url.searchParams.get("agent");
  const tabId = normalizeSessionPart(url.searchParams.get("tabId") ?? "home");
  const taskId = url.searchParams.get("taskId");

  if (!isAgentId(agentParam)) {
    ws.send("\r\n\x1b[31mUnsupported agent. Use codex or claude.\x1b[0m\r\n");
    ws.close(1008, "Unsupported agent");
    return;
  }

  const agent = terminalAgents[agentParam];
  const cwd = resolveTerminalCwd(taskId, options);
  if (!cwd) {
    ws.send("\r\n\x1b[31mTask workspace could not be resolved.\x1b[0m\r\n");
    ws.close(1008, "Task workspace could not be resolved");
    return;
  }

  const sessionKey = `${tabId}:${agent.id}`;
  const session = getOrCreateSession(sessionKey, agent, cwd);
  cancelScheduledCleanup(session);
  session.clients.add(ws);
  if (session.outputBuffer) {
    ws.send(session.outputBuffer);
  }
  ws.send(`\r\n\x1b[90m[attached ${agent.label}: ${agent.command}]\x1b[0m\r\n`);

  ws.on("message", (message: RawData, isBinary) => {
    const input = normalizeMessage(message, isBinary);

    if (input === closeCommand) {
      closeSession(session, 1000, "Terminal session closed");
      return;
    }

    const resize = input.match(resizePattern);

    if (resize) {
      const cols = Number.parseInt(resize[1] ?? "", 10);
      const rows = Number.parseInt(resize[2] ?? "", 10);
      if (Number.isFinite(cols) && Number.isFinite(rows) && cols > 0 && rows > 0) {
        session.pendingSize = { cols, rows };
        if (session.ptyProcess) {
          session.ptyProcess.resize(cols, rows);
        } else {
          spawnAgent(session);
        }
      }
      return;
    }

    if (!session.ptyProcess) {
      spawnAgent(session);
    }

    session.ptyProcess?.write(input);
  });

  ws.on("close", () => {
    if (terminalSessions.get(session.key) !== session) {
      return;
    }

    session.clients.delete(ws);
    if (session.clients.size === 0) {
      scheduleDetachedCleanup(session);
    }
  });
}

function getOrCreateSession(key: string, agent: AgentDefinition, cwd: string): TerminalSession {
  const existing = terminalSessions.get(key);
  if (existing) {
    if (existing.cwd === cwd) {
      return existing;
    }
    closeSession(existing, 1000, "Task workspace changed");
  }

  const config = readTerminalSessionConfig();
  const session: TerminalSession = {
    agent,
    clients: new Set<WebSocket>(),
    cleanupTimer: null,
    cwd,
    detachedTtlMs: config.detachedTtlMs,
    key,
    outputBuffer: "",
    pendingSize: { cols: 100, rows: 30 },
    ptyProcess: null,
    replayBufferBytes: config.replayBufferBytes
  };
  terminalSessions.set(key, session);
  return session;
}

function spawnAgent(session: TerminalSession) {
  if (session.ptyProcess) return;

  try {
    const shell = process.env.SHELL ?? "/bin/zsh";
    session.ptyProcess = pty.spawn(shell, ["-lc", `exec ${session.agent.command}`], {
      cols: session.pendingSize.cols,
      cwd: session.cwd,
      env: buildTerminalEnv(),
      name: "xterm-256color",
      rows: session.pendingSize.rows
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    broadcast(
      session,
      `\r\n\x1b[31mFailed to start ${session.agent.label}: ${message}\x1b[0m\r\n` +
        `\x1b[90mCommand attempted: ${session.agent.command}\x1b[0m\r\n`
    );
    closeSession(session, 1011, "Failed to spawn PTY");
    return;
  }

  broadcast(
    session,
    `\r\n\x1b[90m[started ${session.agent.label}: ${session.agent.command}]\x1b[0m\r\n`
  );

  session.ptyProcess.onData((data) => broadcast(session, data));

  session.ptyProcess.onExit(({ exitCode, signal }) => {
    session.ptyProcess = null;
    broadcast(
      session,
      `\r\n\x1b[90m[${session.agent.label} exited: code=${exitCode} signal=${signal ?? "none"}]\x1b[0m\r\n`
    );
    closeSession(session);
  });
}

function broadcast(session: TerminalSession, data: string) {
  appendOutputBuffer(session, data);

  for (const client of session.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function closeSession(session: TerminalSession, code?: number, reason?: string) {
  if (terminalSessions.get(session.key) === session) {
    terminalSessions.delete(session.key);
  }
  cancelScheduledCleanup(session);

  if (session.ptyProcess) {
    session.ptyProcess.kill();
    session.ptyProcess = null;
  }

  for (const client of session.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.close(code, reason);
    }
  }
  session.clients.clear();
}

function scheduleDetachedCleanup(session: TerminalSession) {
  if (session.cleanupTimer) return;
  if (session.detachedTtlMs <= 0) {
    closeSession(session);
    return;
  }

  session.cleanupTimer = setTimeout(() => {
    if (terminalSessions.get(session.key) === session) {
      closeSession(session);
    }
  }, session.detachedTtlMs);
}

function cancelScheduledCleanup(session: TerminalSession) {
  if (!session.cleanupTimer) return;
  clearTimeout(session.cleanupTimer);
  session.cleanupTimer = null;
}

function appendOutputBuffer(session: TerminalSession, data: string) {
  if (session.replayBufferBytes <= 0) {
    session.outputBuffer = "";
    return;
  }

  session.outputBuffer += data;

  while (Buffer.byteLength(session.outputBuffer, "utf8") > session.replayBufferBytes) {
    const dropLength = Math.max(1, Math.floor(session.outputBuffer.length / 4));
    session.outputBuffer = session.outputBuffer.slice(dropLength);
  }
}

function resolveTerminalCwd(
  taskId: string | null,
  options: TerminalConnectionOptions
): string | null {
  if (taskId) {
    try {
      return options.resolveTaskCwd?.(taskId) ?? null;
    } catch {
      return null;
    }
  }

  return process.env.PRAXIOS_TERMINAL_CWD ?? process.cwd();
}

function normalizeSessionPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9:._-]/g, "_") || "home";
}

function isAgentId(value: string | null): value is AgentId {
  return value === "codex" || value === "claude";
}

function normalizeMessage(message: RawData, isBinary: boolean): string {
  if (typeof message === "string") return message;
  if (Array.isArray(message)) return Buffer.concat(message).toString("utf8");
  if (message instanceof ArrayBuffer) return Buffer.from(new Uint8Array(message)).toString("utf8");
  if (ArrayBuffer.isView(message)) {
    return Buffer.from(message.buffer, message.byteOffset, message.byteLength).toString("utf8");
  }
  return isBinary ? "" : "";
}

export function buildTerminalEnv(
  sourceEnv: NodeJS.ProcessEnv = process.env
): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(sourceEnv)) {
    if (key === "NO_COLOR") {
      continue;
    }
    if (value !== undefined) {
      env[key] = value;
    }
  }
  env.TERM = "xterm-256color";
  env.COLORTERM = "truecolor";
  env.CLICOLOR = "1";
  env.FORCE_COLOR = "1";
  return env;
}

export function readTerminalSessionConfig(
  sourceEnv: NodeJS.ProcessEnv = process.env
): TerminalSessionConfig {
  return {
    detachedTtlMs: readNonNegativeIntegerEnv(
      sourceEnv.TERMINAL_DETACHED_TTL_MS,
      defaultDetachedTtlMs
    ),
    replayBufferBytes: readNonNegativeIntegerEnv(
      sourceEnv.TERMINAL_REPLAY_BUFFER_BYTES,
      defaultReplayBufferBytes
    )
  };
}

function readNonNegativeIntegerEnv(value: string | undefined, fallback: number) {
  if (value === undefined) return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
