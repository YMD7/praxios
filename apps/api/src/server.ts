import { serve } from "@hono/node-server";
import { WebSocketServer } from "ws";
import { createApp } from "./app.js";
import { handleTerminalConnection } from "./terminal.js";

const port = Number(process.env.PORT ?? 8787);
const hostname = process.env.HOST ?? "127.0.0.1";

const server = serve({
  fetch: createApp().fetch,
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
    handleTerminalConnection(ws, url);
  });
});

console.log(`Praxios API listening on http://${hostname}:${port}`);
