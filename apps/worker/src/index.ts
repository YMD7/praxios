/**
 * AI Worker（Phase 0 スタブ）。
 *
 * Phase 3 で Source を解析し、Extract -> Route -> Proposal を生成する
 * パイプラインをここに実装する。現状は接続確認のみ。
 */

import { createDb, createRepositories } from "@praxios/db";

const repos = createRepositories(createDb());

async function tick(): Promise<void> {
  const sources = await repos.sources.list();
  const pending = await repos.proposals.list({ status: "pending" });
  console.log(
    `[worker] sources=${sources.length} pending_proposals=${pending.length} ` +
      `(pipeline not implemented yet — Phase 3)`,
  );
}

const intervalMs = Number(process.env.WORKER_INTERVAL_MS ?? 10_000);
console.log(`[worker] started (interval=${intervalMs}ms)`);
await tick();
setInterval(() => {
  void tick();
}, intervalMs);
