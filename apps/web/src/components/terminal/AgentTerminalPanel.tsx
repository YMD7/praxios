import { Circle } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useConfig } from "@/lib/use-config";
import { cn } from "@/lib/utils";
import { type AgentId } from "./types";
import { WtermTerminal } from "./WtermTerminal";
import type { WtermTerminalHandle } from "./WtermTerminal";

type TerminalStatus = "idle" | "connecting" | "connected" | "closed" | "error";

export interface AgentTerminalPanelHandle {
  closeSession: () => void;
  insertText: (text: string) => void;
}

interface AgentTerminalPanelProps {
  isActive: boolean;
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
  function AgentTerminalPanel({ isActive, tabId = "home", taskId }, ref) {
    const { config, loading, error } = useConfig();
    const [agent, setAgent] = useState<AgentId | null>(null);
    const [status, setStatus] = useState<TerminalStatus>("idle");
    const terminalRef = useRef<WtermTerminalHandle | null>(null);

    // 設定ロード後、選択中エージェントが未設定・または利用不可なら、
    // 利用可能なデフォルト（無ければ利用可能な先頭）へ切り替える。全て不可なら null。
    useEffect(() => {
      if (!config) return;
      const isAvailable = (id: AgentId | null) =>
        config.agents.some((option) => option.id === id && option.available);
      if (isAvailable(agent)) return;

      const fallback = isAvailable(config.defaultAgent)
        ? config.defaultAgent
        : (config.agents.find((option) => option.available)?.id ?? null);
      setAgent(fallback);
    }, [config, agent]);

    useImperativeHandle(
      ref,
      () => ({
        closeSession: () => terminalRef.current?.closeSession(),
        insertText: (text: string) => terminalRef.current?.insertText(text)
      }),
      []
    );

    const agents = config?.agents ?? [];

    return (
      <section className="flex h-full min-h-0 flex-col bg-terminal-background text-terminal-foreground">
        {/* ヘッダー + トグルバーをまとめる帯。下端ボーダーで端末本体と区切る */}
        <div className="shrink-0 border-b border-terminal-border bg-terminal-header">
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

          <div className="flex shrink-0 items-center px-4 py-2">
            {/* 左ペイン（ContextPane）のトグルと同一デザイン。右ペインは常時ダークのため、
                テーマ追従トークンではなくダーク固定の --terminal-* で左のダーク配色を踏襲する。 */}
            <div className="inline-flex rounded-md border border-terminal-border bg-terminal-control p-0.5">
              {agents.map((option) => {
                const disabled = !option.available;
                const selected = agent === option.id;
                return (
                  <Button
                    aria-disabled={disabled}
                    className={cn(
                      "h-7 rounded border px-2 text-xs",
                      disabled
                        ? "cursor-not-allowed border-transparent text-terminal-muted/50 hover:bg-transparent hover:text-terminal-muted/50"
                        : selected
                          ? "cursor-pointer border-terminal-foreground bg-transparent text-terminal-foreground hover:bg-transparent hover:text-terminal-foreground"
                          : "cursor-pointer border-transparent text-terminal-muted hover:bg-terminal-control-hover hover:text-terminal-foreground"
                    )}
                    key={option.id}
                    onClick={() => {
                      if (disabled || selected) return;
                      terminalRef.current?.closeSession();
                      setAgent(option.id);
                    }}
                    size="sm"
                    title={
                      disabled
                        ? `${option.label} は利用できません: ${option.unavailableReason ?? "コマンドが見つかりません"}`
                        : undefined
                    }
                    type="button"
                    variant="ghost"
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          {agent ? (
            <WtermTerminal
              agent={agent}
              isActive={isActive}
              onStatusChange={setStatus}
              ref={terminalRef}
              tabId={tabId}
              taskId={taskId}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center text-xs text-terminal-muted">
              {error ? `設定の読み込みに失敗しました: ${error}` : loading ? "設定を読み込み中..." : "利用可能なエージェントがありません"}
            </div>
          )}
        </div>
      </section>
    );
  }
);
