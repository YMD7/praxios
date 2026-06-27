export type AgentId = "codex" | "claude";

export interface AgentOption {
  id: AgentId;
  label: string;
  command: string;
  description: string;
}

export const agentOptions: AgentOption[] = [
  {
    id: "codex",
    label: "Codex",
    command: "codex",
    description: "OpenAI Codex CLI"
  },
  {
    id: "claude",
    label: "Claude Code",
    command: "claude",
    description: "Anthropic Claude Code CLI"
  }
];
