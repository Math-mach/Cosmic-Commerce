import { ConnectedUser, activeConnections } from "../index";

import { roomManager } from "../managers/roomManager";

export function handleLeaveRoom(user: ConnectedUser) {
    const { roomId } = user;

    if (!roomId) {
        return;
    }

    const room = roomManager.findRoomById(roomId);
    if (!room) {
        user.roomId = null;
        console.warn(
            `Usuário ${user.id} tentou sair de uma sala inexistente (${roomId}). Corrigindo estado.`
        );
        return;
    }

    room.removePlayer(user.id);

    console.log(`Usuário ${user.id} saiu da sala ${room.name} (${room.id})`);

    const remainingPlayers = room.getPlayers();

    if (remainingPlayers.length > 0) {
        const roomInfoPayload = {
            event: "room_info",
            room: {
                id: room.id,
                name: room.name,
                current_users: remainingPlayers.length,
                max_users: room.maxPlayers,
            },
        };
        roomManager.broadcastToRoom(room.id, JSON.stringify(roomInfoPayload));
    } else {
        console.log(`Sala ${room.id} está vazia e será removida.`);
        roomManager.removeRoom(room.id);
    }

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
