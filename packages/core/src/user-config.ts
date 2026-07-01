import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { findWorkspaceRoot } from "./config.js";

/**
 * ユーザーがローカルの JSON ファイルで管理する設定。
 * 現状はターミナルで起動できるエージェント定義とデフォルト選択のみだが、
 * トップレベルキーを増やすだけで設定項目を拡張できる構造にしている。
 */

export interface AgentConfig {
  id: string;
  label: string;
  command: string;
  // zod の .optional()（exactOptionalPropertyTypes 有効）に合わせて undefined を明示的に許容する。
  description?: string | undefined;
}

export interface PraxiosUserConfig {
  agents: AgentConfig[];
  defaultAgent: string;
}

const agentConfigSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  command: z.string().min(1),
  description: z.string().optional()
});

// 各設定ファイルはトップレベルキー単位の部分指定を許可する。
// 未知キーは前方互換のため許容し、読み込み時は無視する（passthrough）。
const partialUserConfigSchema = z
  .object({
    agents: z
      .array(agentConfigSchema)
      .min(1)
      .refine((agents) => new Set(agents.map((agent) => agent.id)).size === agents.length, {
        message: "agent id must be unique"
      })
      .optional(),
    defaultAgent: z.string().min(1).optional()
  })
  .passthrough();

type PartialUserConfig = z.infer<typeof partialUserConfigSchema>;

/** ファイルが存在しない場合に採用する組み込みエージェント定義。 */
export const BUILTIN_AGENTS: AgentConfig[] = [
  { id: "codex", label: "Codex", command: "codex", description: "OpenAI Codex CLI" },
  {
    id: "claude",
    label: "Claude Code",
    command: "claude",
    description: "Anthropic Claude Code CLI"
  }
];

/** 組み込みのデフォルトエージェント ID。 */
export const BUILTIN_DEFAULT_AGENT = "codex";

export interface LoadUserConfigInput {
  /** プロジェクト単位設定ファイルの探索起点。未指定時は workspace root を自動解決。 */
  workspaceRoot?: string;
  /** ユーザー単位設定ファイルの探索に使うホームディレクトリ。主にテスト用。 */
  homeDir?: string;
  /** 環境変数（XDG_CONFIG_HOME 等）の参照元。主にテスト用。 */
  env?: NodeJS.ProcessEnv;
}

/** ユーザー単位設定ファイルのパス（`~/.config/praxios/config.json`、XDG 準拠）。 */
export function getUserConfigPath(input: LoadUserConfigInput = {}): string {
  const env = input.env ?? process.env;
  const homeDir = input.homeDir ?? os.homedir();
  const xdgConfigHome = env.XDG_CONFIG_HOME?.trim();
  const configHome = xdgConfigHome ? xdgConfigHome : path.join(homeDir, ".config");
  return path.join(configHome, "praxios", "config.json");
}

/** プロジェクト単位設定ファイルのパス（`<workspaceRoot>/.praxios/config.json`）。 */
export function getProjectConfigPath(input: LoadUserConfigInput = {}): string {
  const env = input.env ?? process.env;
  const workspaceRoot =
    input.workspaceRoot ?? env.PRAXIOS_WORKSPACE_ROOT ?? findWorkspaceRoot();
  return path.join(workspaceRoot, ".praxios", "config.json");
}

/**
 * 設定ファイルを 1 枚読み込む。存在しなければ null（正常）。
 * JSON 破損・スキーマ不一致は警告を出して null を返し、下位層へフォールバックさせる。
 */
function readConfigFile(filePath: string): PartialUserConfig | null {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(`[praxios] 設定ファイルの JSON を解析できませんでした: ${filePath}`);
    return null;
  }

  const result = partialUserConfigSchema.safeParse(parsed);
  if (!result.success) {
    console.warn(`[praxios] 設定ファイルの内容が不正なため無視します: ${filePath}`);
    return null;
  }

  return result.data;
}

/**
 * 組み込み → ユーザー単位 → プロジェクト単位 の順で上書きマージした実効設定を返す。
 * マージはトップレベルキー単位で、あるキーを定義した最上位の層（project > user > builtin）が
 * そのキーの値を丸ごと決める。defaultAgent が agents に存在しない場合は先頭要素へフォールバック。
 */
export function loadUserConfig(input: LoadUserConfigInput = {}): PraxiosUserConfig {
  const userLayer = readConfigFile(getUserConfigPath(input));
  const projectLayer = readConfigFile(getProjectConfigPath(input));

  const agents = projectLayer?.agents ?? userLayer?.agents ?? BUILTIN_AGENTS;
  const requestedDefault =
    projectLayer?.defaultAgent ?? userLayer?.defaultAgent ?? BUILTIN_DEFAULT_AGENT;

  const defaultAgent = agents.some((agent) => agent.id === requestedDefault)
    ? requestedDefault
    : agents[0]!.id;

  return { agents, defaultAgent };
}
