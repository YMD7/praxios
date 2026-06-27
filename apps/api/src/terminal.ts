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
  cwd: string;
  key: string;
  pendingSize: { cols: number; rows: number };
  ptyProcess: pty.IPty | null;
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
  session.clients.add(ws);
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
    session.clients.delete(ws);
    if (session.clients.size === 0) {
      closeSession(session);
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

  const session: TerminalSession = {
    agent,
    clients: new Set<WebSocket>(),
    cwd,
    key,
    pendingSize: { cols: 100, rows: 30 },
    ptyProcess: null
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
      env: cleanEnv(),
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
  for (const client of session.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function closeSession(session: TerminalSession, code?: number, reason?: string) {
  terminalSessions.delete(session.key);

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

function cleanEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }
  return env;
}
