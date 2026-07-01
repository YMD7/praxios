import { serve } from "@hono/node-server";
import { diagnoseConfig, loadUserConfig, PraxiosCore } from "@praxios/core";
import { WebSocketServer } from "ws";
import { createApp } from "./app.js";
import { handleTerminalConnection } from "./terminal.js";

const port = Number(process.env.PORT ?? 8787);
const hostname = process.env.HOST ?? "127.0.0.1";
const core = new PraxiosCore();

const server = serve({
  fetch: createApp(core).fetch,
  hostname,
  port
});
const terminalWss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${hostname}:${port}`}`);

  if (url.pathname !== "/terminal/ws") {
    socket.destroy();
    return;
  }

  terminalWss.handleUpgrade(request, socket, head, (ws) => {
    handleTerminalConnection(ws, url, {
      resolveTaskCwd: (taskId) => core.syncTaskWorkspace(taskId).path,
      resolveConfig: () => loadUserConfig({ workspaceRoot: core.config.workspaceRoot })
    });
  });
});

console.log(`Praxios API listening on http://${hostname}:${port}`);

// 起動時にエージェントの起動コマンドを診断し、利用不可のものを警告する。
const diagnosed = diagnoseConfig(loadUserConfig({ workspaceRoot: core.config.workspaceRoot }));
for (const agent of diagnosed.agents) {
  if (agent.available) {
    console.log(`Agent "${agent.id}" available: ${agent.resolvedPath ?? agent.command}`);
  } else {
    console.warn(`Agent "${agent.id}" unavailable: ${agent.unavailableReason ?? agent.command}`);
  }
}
