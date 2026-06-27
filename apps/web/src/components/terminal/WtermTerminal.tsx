import { FitAddon } from "@xterm/addon-fit";
import { Terminal as XtermTerminal } from "@xterm/xterm";
import type { ITheme } from "@xterm/xterm";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from "react";
import { useSystemColorScheme, type SystemColorScheme } from "@/lib/use-system-theme";
import type { AgentId } from "./types";

type TerminalStatus = "idle" | "connecting" | "connected" | "closed" | "error";

const closeCommand = "\x1b[TERMINAL:CLOSE]";
const apiBase = import.meta.env.VITE_API_URL ?? "/api";

const terminalThemes: Record<SystemColorScheme, ITheme> = {
  light: {
    background: "#f8fafc",
    black: "#1f2937",
    blue: "#2458a6",
    brightBlack: "#6b7280",
    brightBlue: "#1d4ed8",
    brightCyan: "#0e7490",
    brightGreen: "#15803d",
    brightMagenta: "#7c3aed",
    brightRed: "#b42318",
    brightWhite: "#ffffff",
    brightYellow: "#a16207",
    cursor: "#1f5f46",
    cyan: "#047481",
    foreground: "#1f2937",
    green: "#1f7a4f",
    magenta: "#6d28d9",
    red: "#b42318",
    white: "#e5e7eb",
    yellow: "#9a6700"
  },
  dark: {
    background: "#0d1110",
    black: "#1f2723",
    blue: "#76b7ff",
    brightBlack: "#75837c",
    brightBlue: "#9ccaff",
    brightCyan: "#8ce3d1",
    brightGreen: "#93e6a1",
    brightMagenta: "#d0b3ff",
    brightRed: "#ff8b80",
    brightWhite: "#f5fbf7",
    brightYellow: "#f4d58d",
    cursor: "#edf5ef",
    cyan: "#75d8c8",
    foreground: "#eef7f1",
    green: "#7bd88f",
    magenta: "#c8a5ff",
    red: "#ff8b80",
    white: "#dce8df",
    yellow: "#efc56f"
  }
};

export interface WtermTerminalHandle {
  closeSession: () => void;
  insertText: (text: string) => void;
}

interface WtermTerminalProps {
  agent: AgentId;
  onStatusChange?: (status: TerminalStatus) => void;
  tabId: string;
  taskId?: string | undefined;
}

function getTerminalWebSocketUrl(agent: AgentId, tabId: string, taskId?: string) {
  const params = new URLSearchParams({ agent, tabId });
  if (taskId) {
    params.set("taskId", taskId);
  }

  const url = new URL(apiBase, window.location.origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/$/, "")}/terminal/ws`;
  url.search = params.toString();
  return url.toString();
}

export const WtermTerminal = forwardRef<WtermTerminalHandle, WtermTerminalProps>(
  function WtermTerminal({ agent, onStatusChange, tabId, taskId }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const terminalRef = useRef<XtermTerminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const lastSizeRef = useRef<{ cols: number; rows: number } | null>(null);
    const [terminalReady, setTerminalReady] = useState(false);
    const colorScheme = useSystemColorScheme();
    const terminalTheme = terminalThemes[colorScheme];
    const initialTerminalThemeRef = useRef(terminalTheme);

    const setStatus = useCallback(
      (status: TerminalStatus) => {
        onStatusChange?.(status);
      },
      [onStatusChange]
    );

    const closeSocket = useCallback(() => {
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket && socket.readyState !== WebSocket.CLOSED) {
        socket.close();
      }
    }, []);

    const sendData = useCallback((data: string) => {
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        closeSession: () => {
          sendData(closeCommand);
          closeSocket();
        },
        insertText: (text: string) => {
          sendData(text);
        }
      }),
      [closeSocket, sendData]
    );

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return undefined;

      const terminal = new XtermTerminal({
        cols: 100,
        cursorBlink: true,
        fontFamily: "Menlo, Consolas, 'DejaVu Sans Mono', 'Courier New', monospace",
        fontSize: 14,
        lineHeight: 1.2,
        rows: 30,
        scrollback: 1000,
        theme: initialTerminalThemeRef.current
      });
      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(container);

      const fit = () => {
        fitAddon.fit();
        lastSizeRef.current = { cols: terminal.cols, rows: terminal.rows };
      };
      const fitSoon = () => window.requestAnimationFrame(fit);
      const resizeObserver = new ResizeObserver(fitSoon);
      resizeObserver.observe(container);

      const dataDisposable = terminal.onData(sendData);
      const binaryDisposable = terminal.onBinary(sendData);
      const resizeDisposable = terminal.onResize(({ cols, rows }) => {
        lastSizeRef.current = { cols, rows };
        const socket = socketRef.current;
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(`\x1b[RESIZE:${cols};${rows}]`);
        }
      });

      terminalRef.current = terminal;
      fitAddonRef.current = fitAddon;
      fit();
      setTerminalReady(true);

      return () => {
        setTerminalReady(false);
        dataDisposable.dispose();
        binaryDisposable.dispose();
        resizeDisposable.dispose();
        resizeObserver.disconnect();
        fitAddon.dispose();
        terminal.dispose();
        fitAddonRef.current = null;
        terminalRef.current = null;
      };
    }, [sendData]);

    useEffect(() => {
      const terminal = terminalRef.current;
      if (terminal) {
        terminal.options.theme = terminalTheme;
      }
    }, [terminalTheme]);

    useEffect(() => {
      const terminal = terminalRef.current;
      if (!terminalReady || !terminal) return undefined;

      closeSocket();
      setStatus("connecting");
      terminal.write(`\r\n\x1b[90m[connecting to ${agent}]\x1b[0m\r\n`);

      const socket = new WebSocket(getTerminalWebSocketUrl(agent, tabId, taskId));
      socketRef.current = socket;

      socket.onopen = () => {
        setStatus("connected");
        fitAddonRef.current?.fit();
        const size = lastSizeRef.current ?? { cols: terminal.cols, rows: terminal.rows };
        socket.send(`\x1b[RESIZE:${size.cols};${size.rows}]`);
      };

      socket.onmessage = (event: MessageEvent) => {
        if (typeof event.data === "string") {
          terminal.write(event.data);
        } else if (event.data instanceof Blob) {
          event.data.text().then((text) => terminal.write(text)).catch(() => undefined);
        }
      };

      socket.onerror = () => {
        setStatus("error");
        terminal.write("\r\n\x1b[31m[terminal connection error]\x1b[0m\r\n");
      };

      socket.onclose = () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
        setStatus("closed");
        terminal.write("\r\n\x1b[90m[session ended]\x1b[0m\r\n");
      };

      return () => {
        socket.close();
      };
    }, [agent, closeSocket, setStatus, tabId, taskId, terminalReady]);

    useEffect(() => {
      const onPointerDown = (event: PointerEvent) => {
        const container = containerRef.current;
        const terminal = terminalRef.current;
        if (!container || !terminal || !(event.target instanceof Node)) return;
        if (!container.contains(event.target)) {
          terminal.blur();
        }
      };

      document.addEventListener("pointerdown", onPointerDown, true);
      return () => document.removeEventListener("pointerdown", onPointerDown, true);
    }, []);

    useEffect(() => closeSocket, [closeSocket]);

    return <div className="h-full min-h-0 w-full bg-terminal-background" ref={containerRef} />;
  }
);
