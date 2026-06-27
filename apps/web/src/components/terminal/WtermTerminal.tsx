import { Terminal, useTerminal } from "@wterm/react";
import type { WTerm } from "@wterm/dom";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
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
    const { ref: terminalRef, write, focus } = useTerminal();
    const [terminal, setTerminal] = useState<WTerm | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const lastSizeRef = useRef<{ cols: number; rows: number } | null>(null);

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

    const sendData = useCallback(
      (data: string) => {
        const socket = socketRef.current;
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(data);
          focus();
        }
      },
      [focus]
    );

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
      if (!terminal) return;

      closeSocket();
      setStatus("connecting");
      write(`\r\n\x1b[90m[connecting to ${agent}]\x1b[0m\r\n`);

      const socket = new WebSocket(getTerminalWebSocketUrl(agent, tabId, taskId));
      socketRef.current = socket;

      socket.onopen = () => {
        setStatus("connected");
        const size = lastSizeRef.current ?? { cols: terminal.cols, rows: terminal.rows };
        socket.send(`\x1b[RESIZE:${size.cols};${size.rows}]`);
        focus();
      };

      socket.onmessage = (event: MessageEvent) => {
        if (typeof event.data === "string") {
          write(event.data);
        } else if (event.data instanceof Blob) {
          event.data.text().then((text) => write(text)).catch(() => undefined);
        }
      };

      socket.onerror = () => {
        setStatus("error");
        write("\r\n\x1b[31m[terminal connection error]\x1b[0m\r\n");
      };

      socket.onclose = () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
        setStatus("closed");
        write("\r\n\x1b[90m[session ended]\x1b[0m\r\n");
      };

      return () => {
        socket.close();
      };
    }, [agent, closeSocket, focus, setStatus, tabId, taskId, terminal, write]);

    useEffect(() => closeSocket, [closeSocket]);

    const handleReady = useCallback((instance: WTerm) => {
      setTerminal(instance);
      lastSizeRef.current = { cols: instance.cols, rows: instance.rows };
    }, []);

    const handleData = useCallback((data: string) => sendData(data), [sendData]);

    const handleResize = useCallback((cols: number, rows: number) => {
      lastSizeRef.current = { cols, rows };
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(`\x1b[RESIZE:${cols};${rows}]`);
      }
    }, []);

    const terminalStyle = useMemo(
      () => ({
        borderRadius: 0,
        boxShadow: "none",
        height: "100%",
        minHeight: 0,
        padding: 0
      }),
      []
    );

    return (
      <Terminal
        autoResize
        className="h-full min-h-0 w-full bg-[#111317]"
        cols={100}
        cursorBlink
        onData={handleData}
        onReady={handleReady}
        onResize={handleResize}
        ref={terminalRef}
        rows={30}
        style={terminalStyle}
        theme="monokai"
      />
    );
  }
);
