/**
 * AI Worker。
 *
 * 一定間隔で、まだ Proposal が紐づいていない Source を解析し、
 * Extract -> Route -> Proposal を実行する（status=pending で保存）。
 * 承認・適用は Approval Queue（UI/API）側で行う。
 */

import { createDb, createRepositories } from "@praxios/db";
import { analyzePendingSources } from "@praxios/pipeline";

const repos = createRepositories(createDb());

async function tick(): Promise<void> {
  try {
    const created = await analyzePendingSources(repos);
    if (created > 0) {
      console.log(`[worker] created ${created} proposal(s)`);
    }
  } catch (err) {
    console.error("[worker] tick failed:", err);
  }
}

const intervalMs = Number(process.env.WORKER_INTERVAL_MS ?? 10_000);
const mode = process.env.ANTHROPIC_API_KEY ? "claude" : "heuristic";
console.log(`[worker] started (interval=${intervalMs}ms, extractor=${mode})`);
await tick();
setInterval(() => {
  void tick();
}, intervalMs);
