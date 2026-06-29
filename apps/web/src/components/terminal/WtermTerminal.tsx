import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
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
import type { AgentId } from "./types";

type TerminalStatus = "idle" | "connecting" | "connected" | "closed" | "error";

const closeCommand = "\x1b[TERMINAL:CLOSE]";
const apiBase = import.meta.env.VITE_API_URL ?? "/api";

// ターミナルはライト/ダークに追従させず、常にダークで固定する。
// 起動するエージェント（Claude Code 等）のテーマを外部から取得・指定できず、
// xterm の背景色とエージェントが想定する明暗がズレると表示が崩れるのを防ぐ目的。
// パネルの枠・タブ側は styles.css の --terminal-* で同様にダーク固定している。
const terminalTheme: ITheme = {
  background: "#1C1917",
  black: "#1C1917",
  blue: "#6099C0",
  brightBlack: "#403833",
  brightBlue: "#61ABDA",
  brightCyan: "#65B8C1",
  brightGreen: "#8BAE68",
  brightMagenta: "#CF86C1",
  brightRed: "#E8838F",
  brightWhite: "#888F94",
  brightYellow: "#D68C67",
  cursor: "#C4CACF",
  cyan: "#66A5AD",
  foreground: "#B4BDC3",
  green: "#819B69",
  magenta: "#B279A7",
  red: "#DE6E7C",
  white: "#B4BDC3",
  yellow: "#B77E64"
};

export interface WtermTerminalHandle {
  closeSession: () => void;
  insertText: (text: string) => void;
}

interface WtermTerminalProps {
  agent: AgentId;
  isActive: boolean;
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
  function WtermTerminal({ agent, isActive, onStatusChange, tabId, taskId }, ref) {
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
      }
    }, []);

    const fitTerminal = useCallback(() => {
      const container = containerRef.current;
      const terminal = terminalRef.current;
      const fitAddon = fitAddonRef.current;
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) return;
      if (!terminal || !fitAddon) return;

      fitAddon.fit();
      const size = { cols: terminal.cols, rows: terminal.rows };
      lastSizeRef.current = size;

      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(`\x1b[RESIZE:${size.cols};${size.rows}]`);
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
        // Nerd Font を持つユーザーには効かせる（グリフ単位のフォールバックで、
        // インストール済みの最初のフォントが使われる）。未所持なら Menlo 等に落ちる。
        // 末尾寄りの Symbols Nerd Font Mono は、本文は通常等幅でもアイコン字形だけ補完する用途。
        fontFamily:
          "'JetBrainsMono Nerd Font', 'FiraCode Nerd Font', 'Hack Nerd Font', 'MesloLGS NF', " +
          "'Symbols Nerd Font Mono', Menlo, Consolas, 'DejaVu Sans Mono', 'Courier New', monospace",
        fontSize: 14,
        lineHeight: 1,
        rows: 30,
        scrollback: 1000,
        theme: terminalTheme
      });
      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(container);

      // WebGL レンダラを使い、ブロック/ボックス文字をセル全体に充填して描画させる。
      // DOM レンダラ（既定）はフォントのグリフ任せで、ASCII アート等に隙間が出るため。
      // WebGL 非対応環境やコンテキストロス時は破棄して DOM レンダラへフォールバックする。
      let webglAddon: WebglAddon | null = null;
      try {
        webglAddon = new WebglAddon();
        webglAddon.onContextLoss(() => {
          webglAddon?.dispose();
          webglAddon = null;
        });
        terminal.loadAddon(webglAddon);
      } catch {
        webglAddon?.dispose();
        webglAddon = null;
      }

      const fit = () => {
        fitTerminal();
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
        webglAddon?.dispose();
        fitAddon.dispose();
        terminal.dispose();
        fitAddonRef.current = null;
        terminalRef.current = null;
      };
    }, [fitTerminal, sendData]);

    useEffect(() => {
      if (!isActive) return undefined;

      const frame = window.requestAnimationFrame(fitTerminal);
      return () => window.cancelAnimationFrame(frame);
    }, [fitTerminal, isActive]);

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

    return (
      <div
        className="h-full min-h-0 w-full bg-terminal-background terminal-xterm-host"
        ref={containerRef}
      />
    );
  }
);
