import { ConnectedUser, activeConnections } from "../index";
import { roomManager } from "../managers/roomManager";

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

    const roomInfoPayload = {
        event: "room_info",
        room: {
            id: room.id,
            name: room.name,
            current_users: room.players.size,
            max_users: room.maxPlayers,
        },
    };
    roomManager.broadcastToRoom(room.id, JSON.stringify(roomInfoPayload));

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
