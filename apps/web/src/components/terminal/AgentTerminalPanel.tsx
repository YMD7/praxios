import { Circle } from "lucide-react";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { agentOptions, type AgentId } from "./types";
import { WtermTerminal } from "./WtermTerminal";
import type { WtermTerminalHandle } from "./WtermTerminal";

type TerminalStatus = "idle" | "connecting" | "connected" | "closed" | "error";

export interface AgentTerminalPanelHandle {
  closeSession: () => void;
  insertText: (text: string) => void;
}

interface AgentTerminalPanelProps {
  tabId?: string;
  taskId?: string | undefined;
}

const statusLabels: Record<TerminalStatus, string> = {
  idle: "Idle",
  connecting: "Connecting",
  connected: "Connected",
  closed: "Closed",
  error: "Error"
};

export const AgentTerminalPanel = forwardRef<AgentTerminalPanelHandle, AgentTerminalPanelProps>(
  function AgentTerminalPanel({ tabId = "home", taskId }, ref) {
    const [agent, setAgent] = useState<AgentId>("codex");
    const [status, setStatus] = useState<TerminalStatus>("idle");
    const terminalRef = useRef<WtermTerminalHandle | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        closeSession: () => terminalRef.current?.closeSession(),
        insertText: (text: string) => terminalRef.current?.insertText(text)
      }),
      []
    );

    return (
      <section className="flex h-full min-h-0 flex-col bg-terminal-background text-terminal-foreground">
        <header className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-terminal-border px-4 py-2">
          <h2 className="truncate text-sm font-semibold tracking-normal">AI Terminal</h2>
          <div className="flex shrink-0 items-center gap-2 text-xs text-terminal-muted">
            <Circle
              aria-hidden="true"
              className={cn(
                "h-2.5 w-2.5 fill-current",
                status === "connected" && "text-emerald-400",
                status === "connecting" && "text-amber-300",
                status === "error" && "text-red-400",
                (status === "idle" || status === "closed") && "text-slate-500"
              )}
            />
            <span>{statusLabels[status]}</span>
          </div>
        </header>

        <div className="flex shrink-0 items-center border-b border-terminal-border px-4 py-2">
          <div className="inline-flex rounded-md border bg-muted p-0.5">
            {agentOptions.map((option) => (
              <Button
                className={cn(
                  "h-7 cursor-pointer rounded px-2 text-xs",
                  agent === option.id
                    ? "bg-terminal-tab-active text-terminal-tab-active-foreground hover:bg-terminal-tab-active hover:text-terminal-tab-active-foreground"
                    : "text-terminal-muted hover:bg-muted"
                )}
                key={option.id}
                onClick={() => setAgent(option.id)}
                size="sm"
                type="button"
                variant="ghost"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <WtermTerminal
            agent={agent}
            onStatusChange={setStatus}
            ref={terminalRef}
            tabId={tabId}
            taskId={taskId}
          />
        </div>
      </section>
    );
  }
);
