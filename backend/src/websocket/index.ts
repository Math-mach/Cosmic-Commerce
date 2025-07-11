import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import {
    authenticateWebSocket,
    AuthenticatedUserPayload,
} from "./auth.handler";
import { handleClientMessage } from "./message.handler";
import { handleDisconnection } from "./handlers/disconnection.handler";
import { resumeActionTimer } from "./game/playerAction.handler";
import { roomManager, sendGameNotification } from "./managers/roomManager";

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

            // --- LÓGICA DE RECONEXÃO ---
            for (const room of Array.from(roomManager.getAllRooms().values())) {
                if (
                    room.state === "in_progress" &&
                    room.disconnectedPlayers.has(currentUser.id)
                ) {
                    console.log(
                        `[Sala ${room.id}] Jogador ${currentUser.name} está se reconectando...`
                    );

                    sendGameNotification(
                        room.id,
                        "Jogador Reconectado!",
                        `✅ ${currentUser.name} voltou ao jogo!`,
                        4000
                    );

                    const disconnectionInfo = room.disconnectedPlayers.get(
                        currentUser.id
                    )!;
                    clearTimeout(disconnectionInfo.timer);
                    room.disconnectedPlayers.delete(currentUser.id);

                    room.addPlayer(currentUser);

                    if (room.gameState && room.gameState.turnInfo.id_jogador_da_vez === currentUser.id) {
                        console.log(`[Reconexão Sala ${room.id}] É a vez de ${currentUser.name}. Reiniciando o timer de ação.`);
                        resumeActionTimer(room);
                    }

                    roomManager.broadcastToRoom(
                        room.id,
                        JSON.stringify({
                            event: "game_event",
                            payload: {
                                type: "player_reconnected",
                                payload: {
                                    playerId: currentUser.id,
                                    playerName: currentUser.name,
                                },
                            },
                        })
                    );

                    currentUser.ws.send(
                        JSON.stringify({
                            event: "game_started",
                            payload: room.gameState,
                        })
                    );

                    console.log(
                        `[Sala ${room.id}] Jogador ${currentUser.name} reconectado com sucesso.`
                    );
                    break;
                }
            }
            // --- FIM DA LÓGICA DE RECONEXÃO ---

            activeConnections.add(currentUser);

            console.log(
                `✅ Usuário ${currentUser.email} conectado. Total: ${activeConnections.size}`
            );

            if (!currentUser.roomId) {
                ws.send(
                    JSON.stringify({
                        event: "connected",
                        message: "Bem-vindo ao servidor!",
                    })
                );
            }

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
                handleDisconnection(currentUser);

                activeConnections.delete(currentUser);
                console.log(
                    `❌ Usuário ${currentUser.email} desconectado. Total: ${activeConnections.size}`
                );
            }
        });
    });

    console.log("📡 WebSocket pronto para aceitar conexões.");
}
