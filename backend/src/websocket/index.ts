import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import {
    authenticateWebSocket,
    AuthenticatedUserPayload,
} from "./auth.handler";

import { handleClientMessage } from "./message.handler";

import { handleDisconnection } from "./handlers/disconnection.handler";

export interface ConnectedUser extends AuthenticatedUserPayload {
    ws: WebSocket;
    roomId: string | null;
}

export const activeConnections = new Set<ConnectedUser>();

export function initializeWebSocket(wss: WebSocketServer) {
    wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
        let currentUser: ConnectedUser | null = null;

        try {
            const authPayload = authenticateWebSocket(req);
            currentUser = { ...authPayload, ws, roomId: null };

            activeConnections.add(currentUser);

            console.log(
                `✅ Usuário ${currentUser.email} conectado. Total: ${activeConnections.size}`
            );

            ws.send(
                JSON.stringify({
                    event: "connected",
                    message: "Bem-vindo ao servidor!",
                })
            );

            ws.on("message", (message: Buffer) => {
                handleClientMessage(currentUser!, message.toString());
            });
        } catch (error: any) {
            console.error("❌ Autenticação WebSocket falhou:", error.message);
            ws.send(
                JSON.stringify({
                    event: "error",
                    message: "Authentication failed",
                })
            );
            ws.terminate();
            return;
        }

        ws.on("error", (error) => {
            console.error(
                `Erro na conexão WS do usuário ${currentUser?.email}:`,
                error
            );
        });

        ws.on("close", () => {
            if (currentUser) {
                if (currentUser.roomId) {
                    handleDisconnection(currentUser);
                }

                activeConnections.delete(currentUser);
                console.log(
                    `❌ Usuário ${currentUser.email} desconectado. Total: ${activeConnections.size}`
                );
            }
        });
    });

    console.log("📡 WebSocket pronto para aceitar conexões.");
}
