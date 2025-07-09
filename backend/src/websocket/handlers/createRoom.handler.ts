import { ConnectedUser, activeConnections } from "../index";

import { roomManager } from "../managers/roomManager";

export function handleCreateRoom(user: ConnectedUser) {
    if (user.roomId) {
        user.ws.send(
            JSON.stringify({
                event: "error",
                message:
                    "Você já está em uma sala. Saia primeiro para criar uma nova.",
            })
        );
        return;
    }

    const newRoom = roomManager.createRoom(user.name);

    try {
        newRoom.addPlayer(user);
    } catch (error: any) {
        user.ws.send(
            JSON.stringify({ event: "error", message: error.message })
        );
        roomManager.removeRoom(newRoom.id);
        return;
    }

    const roomInfoPayload = {
        event: "room_info",
        room: {
            id: newRoom.id,
            name: newRoom.name,
            current_users: newRoom.players.size,
            max_users: newRoom.maxPlayers,
        },
    };
    user.ws.send(JSON.stringify(roomInfoPayload));

    console.log(
        `Usuário ${user.id} criou e entrou na sala ${newRoom.name} (${newRoom.id})`
    );

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
