import { ConnectedUser, activeConnections } from "../index";
import { roomManager } from "../managers/roomManager";

export function handleGameStart(user: ConnectedUser) {
    const { roomId, name } = user;

    if (!roomId) {
        user.ws.send(
            JSON.stringify({
                event: "error",
                message: "Você não está em uma sala para iniciar um jogo.",
            })
        );
        return;
    }

    const room = roomManager.findRoomById(roomId);
    if (!room) {
        console.error(
            `ERRO CRÍTICO: Usuário ${user.id} está na sala ${roomId} que não existe.`
        );
        user.roomId = null;
        return;
    }

    try {
        room.startGame();
        console.log(
            `🎮 Jogo iniciado na sala ${room.name} (${roomId}) por ${name}.`
        );
    } catch (error: any) {
        user.ws.send(
            JSON.stringify({
                event: "error",
                message: `Não foi possível iniciar o jogo: ${error.message}`,
            })
        );
        return;
    }

    // 3. Notificar todos na sala que o jogo começou.
    const gameStartPayload = {
        event: "game_start",
        message: `O jogo foi iniciado por ${name}! Preparem-se!`,
    };
    roomManager.broadcastToRoom(roomId, JSON.stringify(gameStartPayload));

    broadcastRoomListUpdate();
}

function broadcastRoomListUpdate() {
    const publicRooms = roomManager.getPublicRooms();
    const roomListPayload = {
        event: "room_list",
        rooms: publicRooms,
    };

    for (const connection of activeConnections) {
        if (connection.roomId === null) {
            connection.ws.send(JSON.stringify(roomListPayload));
        }
    }
}
