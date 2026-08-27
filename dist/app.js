"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const routes_1 = __importDefault(require("./routes"));
const websocket_1 = require("./websocket");
const ws_1 = require("ws");
dotenv_1.default.config();
const app = (0, express_1.default)();
//create an http server to handle http requests
const server = http_1.default.createServer(app);
//create a webSocket server and attach to the existing http server
const wss = new ws_1.WebSocketServer({ server });
const corsOptions = {
    //cors options for the server to allow requests from all origins
    origin: "*"
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use("/api", routes_1.default);
app.get('/api', (_, res) => {
    res.status(200).json({ status: 'ok' });
});
(0, websocket_1.startWebSocketServer)(wss);
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`HTTP + WebSocket server running on http://localhost:${PORT}`);
});
