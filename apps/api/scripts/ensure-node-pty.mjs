import fs from "node:fs";
import path from "node:path";

const pnpmDir = path.resolve(process.cwd(), "../../node_modules/.pnpm");

if (!fs.existsSync(pnpmDir)) {
  process.exit(0);
}

for (const entry of fs.readdirSync(pnpmDir)) {
  if (!entry.startsWith("node-pty@")) continue;

  const prebuildsDir = path.join(pnpmDir, entry, "node_modules/node-pty/prebuilds");
  if (!fs.existsSync(prebuildsDir)) continue;

  for (const platformDir of fs.readdirSync(prebuildsDir)) {
    if (!platformDir.startsWith("darwin-")) continue;

    const helperPath = path.join(prebuildsDir, platformDir, "spawn-helper");
    if (!fs.existsSync(helperPath)) continue;

    fs.chmodSync(helperPath, 0o755);
  }
}
