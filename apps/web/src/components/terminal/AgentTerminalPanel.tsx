import { Bot, Circle, TerminalSquare } from "lucide-react";
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
    const selectedAgent = useMemo(
      () => agentOptions.find((option) => option.id === agent) ?? agentOptions[0]!,
      [agent]
    );

    useImperativeHandle(
      ref,
      () => ({
        closeSession: () => terminalRef.current?.closeSession(),
        insertText: (text: string) => terminalRef.current?.insertText(text)
      }),
      []
    );

    return (
      <section className="flex h-full min-h-0 flex-col bg-[#111317] text-slate-100">
        <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-300">
              <Bot aria-hidden="true" className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-normal">AI Terminal</h1>
              <p className="truncate text-xs text-slate-400">{selectedAgent.description}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
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
            <Button
              className="border-white/15 bg-white/5 text-slate-100 hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <TerminalSquare aria-hidden="true" />
              Local
            </Button>
          </div>
        </header>

        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-2">
          <Tabs
            className="w-auto"
            defaultValue={agent}
            onValueChange={(value) => setAgent(value as AgentId)}
            value={agent}
          >
            <TabsList className="bg-white/10 text-slate-300">
              {agentOptions.map((option) => (
                <TabsTrigger
                  className="data-[state=active]:bg-white data-[state=active]:text-slate-950"
                  key={option.id}
                  value={option.id}
                >
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Separator className="h-5 bg-white/10" orientation="vertical" />
          <p className="truncate text-xs text-slate-400">
            Command: <span className="font-mono text-slate-300">{selectedAgent.command}</span>
          </p>
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
