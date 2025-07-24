import { ConnectedUser } from "../index";

import { roomManager } from "../managers/roomManager";
import { WebSocket } from "ws";

export function handleChatMessage(user: ConnectedUser, message: string) {
    const { roomId, name, id: userId } = user;

    if (!roomId) {
        console.warn(
            `Usuário ${userId} tentou usar o chat sem estar em uma sala.`
        );
        user.ws.send(
            JSON.stringify({
                event: "error",
                message:
                    "Você precisa estar em uma sala para enviar mensagens.",
            })
        );
        return;
    }

    const room = roomManager.findRoomById(roomId);
    if (!room) {
        console.error(
            `ERRO CRÍTICO: Usuário ${userId} tem roomId ${roomId}, mas a sala não foi encontrada.`
        );
        user.roomId = null;
        user.ws.send(
            JSON.stringify({
                event: "error",
                message: "Erro: A sala em que você estava não existe mais.",
            })
        );
        return;
    }

    console.log(`💬 [Sala: ${roomId}] Mensagem de ${name}: ${message}`);

    const broadcastPayload = {
        event: "chat_message",
        from: name,
        message,
    };

    const echoPayload = {
        event: "chat_echo",
        message,
    };

    const jsonBroadcast = JSON.stringify(broadcastPayload);
    const jsonEcho = JSON.stringify(echoPayload);

    for (const player of room.getPlayers()) {
        if (player.ws.readyState !== WebSocket.OPEN) continue;

        if (player.id === userId) {
            player.ws.send(jsonEcho);
        } else {
            player.ws.send(jsonBroadcast);
        }
    }
}
