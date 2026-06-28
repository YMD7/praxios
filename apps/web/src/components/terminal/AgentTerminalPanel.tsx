import { Circle } from "lucide-react";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
          <Tabs
            className="w-auto"
            defaultValue={agent}
            onValueChange={(value) => setAgent(value as AgentId)}
            value={agent}
          >
            <TabsList className="h-auto rounded-sm border border-terminal-border bg-terminal-background p-0">
              {agentOptions.map((option) => (
                <TabsTrigger
                  className={cn(
                    "h-8 px-3 py-0 text-xs font-medium text-terminal-muted",
                    "border-r border-terminal-border rounded-none last:border-r-0",
                    "data-[state=active]:bg-terminal-tab-active data-[state=active]:text-terminal-tab-active-foreground",
                    "data-[state=active]:font-semibold"
                  )}
                  key={option.id}
                  value={option.id}
                >
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
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
