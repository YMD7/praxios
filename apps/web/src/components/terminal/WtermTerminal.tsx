import { FitAddon } from "@xterm/addon-fit";
import { Terminal as XtermTerminal } from "@xterm/xterm";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from "react";
import type { AgentId } from "./types";

type TerminalStatus = "idle" | "connecting" | "connected" | "closed" | "error";

const closeCommand = "\x1b[TERMINAL:CLOSE]";
const apiBase = import.meta.env.VITE_API_URL ?? "/api";

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
        terminalRef.current?.focus();
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
        theme: {
          background: "#111317",
          black: "#272822",
          blue: "#66d9ef",
          brightBlack: "#75715e",
          brightBlue: "#66d9ef",
          brightCyan: "#a1efe4",
          brightGreen: "#a6e22e",
          brightMagenta: "#ae81ff",
          brightRed: "#f92672",
          brightWhite: "#f9f8f5",
          brightYellow: "#f4bf75",
          cursor: "#f8f8f0",
          cyan: "#a1efe4",
          foreground: "#f8f8f2",
          green: "#a6e22e",
          magenta: "#ae81ff",
          red: "#f92672",
          white: "#f8f8f2",
          yellow: "#f4bf75"
        }
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
      terminal.focus();
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
        terminal.focus();
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

    useEffect(() => closeSocket, [closeSocket]);

    return <div className="h-full min-h-0 w-full bg-[#111317]" ref={containerRef} />;
  }
);
