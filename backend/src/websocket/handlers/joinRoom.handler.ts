import { ConnectedUser, activeConnections } from "../index";
import {
    roomManager,
    broadcastRoomListUpdateToLobby,
} from "../managers/roomManager";

export function handleJoinRoom(
    user: ConnectedUser,
    payload: { roomId: string }
) {
    if (user.roomId) {
        user.ws.send(
            JSON.stringify({
                event: "join_error",
                message: "Você já está em uma sala.",
            })
        );
        return;
    }
    if (!payload || !payload.roomId) {
        user.ws.send(
            JSON.stringify({
                event: "join_error",
                message: "Código da sala inválido.",
            })
        );
        return;
    }

    const room = roomManager.findRoomById(payload.roomId);
    if (!room) {
        user.ws.send(
            JSON.stringify({
                event: "join_error",
                message: "Sala não encontrada.",
            })
        );
        return;
    }

    try {
        room.addPlayer(user);
    } catch (error: any) {
        user.ws.send(
            JSON.stringify({
                event: "join_error",
                message: error.message,
            })
        );
        return;
    }

    console.log(
        `Usuário ${user.name} entrou na sala ${room.name} (${room.id})`
    );

    const joinMessagePayload = {
        event: 'chat_message',
        from: 'Sistema',
        message: `${user.name} entrou na sala.`,
        isSystemMessage: true
    };
    roomManager.broadcastToRoom(room.id, JSON.stringify(joinMessagePayload));

    const host = room.players.get(room.hostId!);

    const roomInfoPayload = {
        event: "room_info",
        room: {
            id: room.id,
            name: room.name,
            hostName: host?.name || "N/D",
            current_users: room.players.size,
            max_users: room.maxPlayers,
        },
    };
    roomManager.broadcastToRoom(room.id, JSON.stringify(roomInfoPayload));

    broadcastRoomListUpdateToLobby(activeConnections);
}