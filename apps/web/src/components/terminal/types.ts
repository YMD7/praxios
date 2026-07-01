import type { DiagnosedAgent, DiagnosedConfig } from "@praxios/core";

// エージェント定義・デフォルト・可用性診断はローカル JSON 設定（`/config`）が単一ソース。
// フロントは型のみを core から借り、実データは API から取得する。
export type AgentId = string;

export type { DiagnosedAgent, DiagnosedConfig };
