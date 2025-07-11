import { ConnectedUser, activeConnections } from "../index";

import {
    roomManager,
    broadcastRoomListUpdateToLobby,
} from "../managers/roomManager";

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

    const host = newRoom.players.get(newRoom.hostId!);

    const roomInfoPayload = {
        event: "room_info",
        room: {
            id: newRoom.id,
            name: newRoom.name,
            hostName: host?.name || "N/D",
            current_users: newRoom.players.size,
            max_users: newRoom.maxPlayers,
            players: newRoom.getPlayers().map(p => ({ id: p.id, name: p.name })),
        },
    };
    user.ws.send(JSON.stringify(roomInfoPayload));

    console.log(
        `Usuário ${user.id} criou e entrou na sala ${newRoom.name} (${newRoom.id})`
    );

    broadcastRoomListUpdateToLobby(activeConnections);
}
