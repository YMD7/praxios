import { PraxiosCore } from "@praxios/core";

const core = new PraxiosCore();
const intervalMs = Number(process.env.PRAXIOS_WORKER_INTERVAL_MS ?? 15000);

function tick(): void {
  const result = core.processPendingSources();
  if (result.processedSourceCount > 0) {
    console.log(
      `Processed ${result.processedSourceCount} source(s), created ${result.proposalCount} proposal(s)`
    );
  }
}

tick();

const timer = setInterval(tick, intervalMs);

function shutdown(): void {
  clearInterval(timer);
  core.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
