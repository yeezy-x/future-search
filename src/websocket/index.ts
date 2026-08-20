import { WebSocketServer } from "ws";
import { handleConnection } from "./connectionManager";

export const startWebSocketServer = (
  wss: WebSocketServer
) => {
  wss.on("connection", handleConnection);
  console.log("WebSocket server initialized");
};