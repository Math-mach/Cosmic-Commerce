import { ConnectedUser } from "./index";
import {
    handleChatMessage,
    handleGetRooms,
    handleCreateRoom,
    handleJoinRoom,
    handleLeaveRoom,
} from "./handlers";

import { roomManager } from "./managers/roomManager";

import { handlePlayerAction } from "./game";

export function handleClientMessage(user: ConnectedUser, rawMessage: string) {
    try {
        const data = JSON.parse(rawMessage);

        switch (data.type) {
            case "get_rooms":
                handleGetRooms(user);
                break;

            case "create_room":
                handleCreateRoom(user);
                break;

            case "join_room":
                handleJoinRoom(user, data.payload);
                break;

            case "leave_room":
                handleLeaveRoom(user);
                break;

            case "chat":
                handleChatMessage(user, data.payload);
                break;

            case "start_game":
                const room = roomManager.findRoomById(user.roomId!);
                if (!room) {
                    user.ws.send(
                        JSON.stringify({
                            event: "error",
                            message: "Sala não encontrada.",
                        })
                    );
                    return;
                }

                if (room.hostId !== user.id) {
                    user.ws.send(
                        JSON.stringify({
                            event: "error",
                            message:
                                "Apenas o dono da sala pode iniciar o jogo.",
                        })
                    );
                    return;
                }

                try {
                    room.startGame();

                    roomManager.broadcastToRoom(
                        user.roomId!,
                        JSON.stringify({
                            event: "game_started",
                            payload: room.gameState,
                        })
                    );
                } catch (error: any) {
                    user.ws.send(
                        JSON.stringify({
                            event: "error",
                            message: error.message,
                        })
                    );
                }
                break;

            case "player_action":
                handlePlayerAction(user, data.payload);
                break;

            default:
                user.ws.send(
                    JSON.stringify({
                        event: "error",
                        message: `Tipo de mensagem desconhecido: ${data.type}`,
                    })
                );
        }
    } catch (err) {
        console.error("Erro ao processar mensagem:", err);
        user.ws.send(
            JSON.stringify({ event: "error", message: "Mensagem inválida" })
        );
    }
}
