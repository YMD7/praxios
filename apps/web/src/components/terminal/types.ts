import type { AgentConfig, PraxiosUserConfig } from "@praxios/core";

// エージェント定義・デフォルトはローカル JSON 設定（`/config`）が単一ソース。
// フロントは型のみを core から借り、実データは API から取得する。
export type AgentId = string;
export type AgentOption = AgentConfig;

export type { AgentConfig, PraxiosUserConfig };
