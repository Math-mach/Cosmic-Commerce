import { ConnectedUser } from "..";

import { roomManager } from "../managers/roomManager";

export function handleDisconnection(user: ConnectedUser) {
    if (!user.roomId) {
        return;
    }

    console.log(`Usuário ${user.name} desconectado da sala ${user.roomId}`);

    const room = roomManager.findRoomById(user.roomId);
    if (!room) {
        console.warn(
            `Sala ${user.roomId} não encontrada durante a desconexão.`
        );
        return;
    }
    const wasHost = room.hostId === user.id;

    room.removePlayer(user.id);

    const remainingPlayers = room.getPlayers();

    if (remainingPlayers.length > 0) {
        if (wasHost) {
            room.promoteNextHost();
        }

        const host = room.players.get(room.hostId!);
        const roomInfoPayload = {
            event: "room_info",
            room: {
                id: room.id,
                name: room.name,
                hostName: host?.name || "N/D",
                current_users: remainingPlayers.length,
                max_users: room.maxPlayers,
            },
        };
        roomManager.broadcastToRoom(room.id, JSON.stringify(roomInfoPayload));
    } else {
        console.log(`Sala ${room.id} está vazia e será removida.`);
        roomManager.removeRoom(room.id);
    }
}
