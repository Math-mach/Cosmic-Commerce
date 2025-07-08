import express, { Express } from "express";
import cookieParser from "cookie-parser";
import { WebSocketServer } from "ws";
import http from "http";
import path from "path";
import { initializeWebSocket } from "./websocket";
import { authenticateWebSocket } from "./websocket/auth.handler";

import config from "./config";

const PORT: number = Number(config.PORT) || 3000;
const app: Express = express();

app.use(cookieParser());
app.use(express.json());

const Routes = require("./routes");
app.use("/api/", Routes);

app.use(express.static(path.join(__dirname, "../../frontend")));

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
    try {
        authenticateWebSocket(req);

        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit("connection", ws, req);
        });
    } catch (err: any) {
        console.error("❌ Upgrade WebSocket recusado:", err.message);
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
    }
});

initializeWebSocket(wss);

server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
