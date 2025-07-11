import { ConnectedUser, activeConnections } from "..";
import { passTurn } from "../game/playerAction.handler";
import { roomManager, broadcastRoomListUpdateToLobby, sendGameNotification } from "../managers/roomManager";

export function handleLeaveGame(user: ConnectedUser) {
    const { roomId, id: userId, name } = user;

    if (!roomId) {
        return;
    }

    const room = roomManager.findRoomById(roomId);

    if (!room || room.state !== 'in_progress' || !room.gameState) {
        return;
    }

    console.log(`[Sala ${room.id}] Jogador ${name} está saindo voluntariamente da partida.`);

    sendGameNotification(room.id, "Jogador Saiu", `👋 ${name} abandonou a partida.`, 5000);
    const chatMessage = {
        event: 'chat_message',
        from: 'Sistema',
        message: `${name} saiu do jogo.`,
        isSystemMessage: true
    };
    roomManager.broadcastToRoom(room.id, JSON.stringify(chatMessage));

    const wasHost = room.hostId === userId;
    const wasTheirTurn = room.removePlayerFromGame(userId);
    room.removePlayer(userId);
    user.roomId = null;

    if (room.getPlayers().length < 2) {
        console.log(`[Sala ${room.id}] Menos de 2 jogadores restantes. Encerrando o jogo.`);
        sendGameNotification(room.id, "Jogo Encerrado", "Não há jogadores suficientes para continuar.", 6000);

        setTimeout(() => {
            room.endGame();

            roomManager.broadcastToRoom(room.id, JSON.stringify({
                event: 'game_ended_by_leave',
                payload: { message: 'O outro jogador saiu. O jogo foi encerrado.' }
            }));

            broadcastRoomListUpdateToLobby(activeConnections);

            if (room.getPlayers().length === 0) {
                roomManager.removeRoom(room.id);
            }
        }, 1000);
        return;
    }

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

    if (wasTheirTurn) {
        passTurn(room);
    } else {

        roomManager.broadcastToRoom(
            room.id,
            JSON.stringify({
                event: 'gameStateUpdate',
                payload: { type: 'gameStateUpdate', payload: room.gameState! },
            })
        );
    }

    broadcastRoomListUpdateToLobby(activeConnections);
}