import { ConnectedUser, activeConnections } from "../index";

import {
    roomManager,
    broadcastRoomListUpdateToLobby,
} from "../managers/roomManager";

export function handleLeaveRoom(user: ConnectedUser) {
    const { roomId, id: userId, name } = user;

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

    const wasHost = room.hostId === userId;

    room.removePlayer(user.id);

    console.log(`Usuário ${user.id} saiu da sala ${room.name} (${room.id})`);

    const leaveMessagePayload = {
        event: 'chat_message',
        from: 'Sistema',
        message: `${name} saiu da sala.`,
        isSystemMessage: true
    };
    roomManager.broadcastToRoom(room.id, JSON.stringify(leaveMessagePayload));

    const remainingPlayers = room.getPlayers();

    if (remainingPlayers.length > 0) {
        if (wasHost) {
            room.promoteNextHost();
            const newHost = room.players.get(room.hostId!);
            if (newHost) {
                const promotionMessage = {
                    event: 'chat_message',
                    from: 'Sistema',
                    message: `O anfitrião, ${name}, saiu. ${newHost.name} agora é o novo anfitrião.`,
                    isSystemMessage: true
                };
                roomManager.broadcastToRoom(room.id, JSON.stringify(promotionMessage));
            }
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

    broadcastRoomListUpdateToLobby(activeConnections);
}