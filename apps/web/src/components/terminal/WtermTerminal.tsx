import { Terminal, useTerminal } from "@wterm/react";
import type { WTerm } from "@wterm/dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AgentId } from "./types";

type TerminalStatus = "idle" | "connecting" | "connected" | "closed" | "error";

interface WtermTerminalProps {
  agent: AgentId;
  onStatusChange?: (status: TerminalStatus) => void;
}

function getTerminalWebSocketUrl(agent: AgentId) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const params = new URLSearchParams({ agent });
  return `${protocol}//${window.location.host}/api/terminal/ws?${params.toString()}`;
}

export function WtermTerminal({ agent, onStatusChange }: WtermTerminalProps) {
  const { ref, write, focus } = useTerminal();
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

  useEffect(() => {
    if (!terminal) return;

    closeSocket();
    setStatus("connecting");
    write(`\r\n\x1b[90m[connecting to ${agent}]\x1b[0m\r\n`);

    const socket = new WebSocket(getTerminalWebSocketUrl(agent));
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
  }, [agent, closeSocket, focus, setStatus, terminal, write]);

  useEffect(() => closeSocket, [closeSocket]);

  const handleReady = useCallback((instance: WTerm) => {
    setTerminal(instance);
    lastSizeRef.current = { cols: instance.cols, rows: instance.rows };
  }, []);

  const handleData = useCallback((data: string) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(data);
    }
  }, []);

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
      ref={ref}
      rows={30}
      style={terminalStyle}
      theme="monokai"
    />
  );
}
