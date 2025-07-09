import express, { Express } from "express";
import cookieParser from "cookie-parser";
import { WebSocketServer } from "ws";
import http from "http";
import cors from "cors";
import { initializeWebSocket } from "./websocket";
import { authenticateWebSocket } from "./websocket/auth.handler";

import config from "./config";

const PORT: number = Number(config.PORT) || 7000;
const app: Express = express();

app.use(
    cors({
        origin: "http://localhost:8080", // deve bater com o que roda o frontend
        credentials: true, // necessário se você usar cookies
    })
);

app.use(cookieParser());
app.use(express.json());

const Routes = require("./routes");
app.use("/api/", Routes);

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
    if (req.url !== "/ws") {
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        socket.destroy();
        return;
    }

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
    console.log(`API rodando em http://localhost:${PORT}`);
});
