import * as pty from "node-pty";
import process from "node:process";
import { WebSocket, type RawData } from "ws";

type AgentId = "codex" | "claude";

interface AgentDefinition {
  id: AgentId;
  label: string;
  command: string;
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

export function listTerminalAgents() {
  return Object.values(terminalAgents);
}

export function handleTerminalConnection(ws: WebSocket, url: URL) {
  const agentParam = url.searchParams.get("agent");

  if (!isAgentId(agentParam)) {
    ws.send("\r\n\x1b[31mUnsupported agent. Use codex or claude.\x1b[0m\r\n");
    ws.close(1008, "Unsupported agent");
    return;
  }

  const agent = terminalAgents[agentParam];
  let ptyProcess: pty.IPty | null = null;
  let pendingSize = { cols: 100, rows: 30 };

  const spawnAgent = () => {
    if (ptyProcess) return;

    try {
      const shell = process.env.SHELL ?? "/bin/zsh";
      ptyProcess = pty.spawn(shell, ["-lc", `exec ${agent.command}`], {
        cols: pendingSize.cols,
        cwd: process.env.PRAXIOS_TERMINAL_CWD ?? process.cwd(),
        env: cleanEnv(),
        name: "xterm-256color",
        rows: pendingSize.rows
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ws.send(
        `\r\n\x1b[31mFailed to start ${agent.label}: ${message}\x1b[0m\r\n` +
          `\x1b[90mCommand attempted: ${agent.command}\x1b[0m\r\n`
      );
      ws.close(1011, "Failed to spawn PTY");
      return;
    }

    ws.send(`\r\n\x1b[90m[started ${agent.label}: ${agent.command}]\x1b[0m\r\n`);

    ptyProcess.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          `\r\n\x1b[90m[${agent.label} exited: code=${exitCode} signal=${signal ?? "none"}]\x1b[0m\r\n`
        );
        ws.close();
      }
    });
  };

  ws.on("message", (message: RawData, isBinary) => {
    const input = normalizeMessage(message, isBinary);
    const resize = input.match(resizePattern);

    if (resize) {
      const cols = Number.parseInt(resize[1] ?? "", 10);
      const rows = Number.parseInt(resize[2] ?? "", 10);
      if (Number.isFinite(cols) && Number.isFinite(rows) && cols > 0 && rows > 0) {
        pendingSize = { cols, rows };
        if (ptyProcess) {
          ptyProcess.resize(cols, rows);
        } else {
          spawnAgent();
        }
      }
      return;
    }

    if (!ptyProcess) {
      spawnAgent();
    }

    ptyProcess?.write(input);
  });

  ws.on("close", () => {
    if (ptyProcess) {
      ptyProcess.kill();
      ptyProcess = null;
    }
  });
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
