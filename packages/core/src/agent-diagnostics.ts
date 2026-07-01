import fs from "node:fs";
import path from "node:path";
import type { AgentConfig, PraxiosUserConfig } from "./user-config.js";

/**
 * エージェントの起動コマンドが実行可能かを診断する。
 * コマンドは実際には実行せず、先頭トークン（実行ファイル）を PATH 上で解決できるか、
 * および実行可能かを in-process で確認する（副作用なし・高速）。
 *
 * 前提: 解決には `process.env.PATH` を使う。ターミナルの実際の spawn は
 * `buildTerminalEnv()` 経由で `process.env` を継承するため、通常は一致する。
 * login shell のプロファイルでのみ PATH に追加されるコマンドは検知できない場合がある。
 */

export interface AgentDiagnostic {
  available: boolean;
  /** 利用不可の理由（UI 表示用）。available=true のときは undefined。 */
  reason?: string;
  /** 解決できた実行ファイルの絶対/指定パス。 */
  resolvedPath?: string;
}

export interface DiagnosedAgent extends AgentConfig {
  available: boolean;
  unavailableReason?: string;
  resolvedPath?: string;
}

export interface DiagnosedConfig {
  agents: DiagnosedAgent[];
  defaultAgent: string;
}

/** コマンド文字列から先頭トークン（実行ファイル名/パス）を取り出す。 */
function firstToken(command: string): string | null {
  const trimmed = command.trim();
  if (!trimmed) return null;

  const quote = trimmed[0];
  if (quote === '"' || quote === "'") {
    const end = trimmed.indexOf(quote, 1);
    return end > 1 ? trimmed.slice(1, end) : null;
  }

  const match = trimmed.match(/^\S+/);
  return match ? match[0] : null;
}

/** 指定パスが実行可能な通常ファイル（へのシンボリックリンク）かを判定する。 */
function isExecutableFile(candidate: string): boolean {
  try {
    const stat = fs.statSync(candidate); // シンボリックリンクは追跡される
    if (!stat.isFile()) return false;
    fs.accessSync(candidate, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** 先頭トークンを PATH または明示パスで解決する。解決できなければ null。 */
function resolveExecutable(token: string, env: NodeJS.ProcessEnv): string | null {
  // パス区切りを含む場合は PATH 探索せず、そのパスを直接評価する。
  if (token.includes(path.sep) || token.includes("/")) {
    return isExecutableFile(token) ? token : null;
  }

  const searchPath = env.PATH ?? "";
  for (const dir of searchPath.split(path.delimiter)) {
    if (!dir) continue;
    const candidate = path.join(dir, token);
    if (isExecutableFile(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function diagnoseAgentCommand(
  command: string,
  env: NodeJS.ProcessEnv = process.env
): AgentDiagnostic {
  const token = firstToken(command);
  if (!token) {
    return { available: false, reason: "起動コマンドが空です" };
  }

  const resolved = resolveExecutable(token, env);
  if (!resolved) {
    return { available: false, reason: `コマンドが見つかりません: ${token}` };
  }

  return { available: true, resolvedPath: resolved };
}

/**
 * 設定内の全エージェントを診断し、可用性フラグ付きの実効設定を返す。
 * defaultAgent は「設定値が利用可能ならそれ、不可なら利用可能な先頭要素」に補正する
 * （全て不可の場合は設定値のまま）。
 */
export function diagnoseConfig(
  config: PraxiosUserConfig,
  env: NodeJS.ProcessEnv = process.env
): DiagnosedConfig {
  const agents: DiagnosedAgent[] = config.agents.map((agent) => {
    const diagnostic = diagnoseAgentCommand(agent.command, env);
    if (diagnostic.available) {
      const diagnosed: DiagnosedAgent = { ...agent, available: true };
      if (diagnostic.resolvedPath) diagnosed.resolvedPath = diagnostic.resolvedPath;
      return diagnosed;
    }
    const diagnosed: DiagnosedAgent = { ...agent, available: false };
    if (diagnostic.reason) diagnosed.unavailableReason = diagnostic.reason;
    return diagnosed;
  });

  const isAvailable = (id: string) => agents.some((agent) => agent.id === id && agent.available);
  const defaultAgent = isAvailable(config.defaultAgent)
    ? config.defaultAgent
    : (agents.find((agent) => agent.available)?.id ?? config.defaultAgent);

  return { agents, defaultAgent };
}
