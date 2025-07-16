import { ConnectedUser, activeConnections } from "..";
import { passTurn, handlePlayerAction, clearActionTimer } from "../game/playerAction.handler";
import {
    roomManager,
    broadcastRoomListUpdateToLobby,
    sendGameNotification,
} from "../managers/roomManager";

export function handleDisconnection(user: ConnectedUser) {
    if (!user.roomId) {
        return;
    }

    const room = roomManager.findRoomById(user.roomId);
    if (!room) {
        console.warn(
            `[handleDisconnection] Sala ${user.roomId} não encontrada para o usuário ${user.name}.`
        );
        return;
    }

    console.log(
        `[handleDisconnection] Processando desconexão para ${user.name} na sala ${room.id} (estado: ${room.state}).`
    );

    const wasHost = room.hostId === user.id;
    const oldHostName = user.name;
    const wasTheirTurn = room.state === 'in_progress' && room.gameState?.turnInfo.id_jogador_da_vez === user.id;

    if (wasTheirTurn) {
        clearActionTimer(room);
    }

    if (room.state === "waiting") {
        console.log(
            `Usuário ${user.name} desconectado do lobby da sala ${user.roomId}.`
        );
        room.removePlayer(user.id);

        const disconnectMessage = {
            event: 'chat_message',
            from: 'Sistema',
            message: `${user.name} saiu da sala.`,
            isSystemMessage: true
        };
        roomManager.broadcastToRoom(room.id, JSON.stringify(disconnectMessage));

        const remainingPlayers = room.getPlayers();
        if (remainingPlayers.length > 0) {
            if (wasHost) {
                room.promoteNextHost();
                const newHost = room.players.get(room.hostId!);
                if (newHost) {
                    const promotionMessage = {
                        event: 'chat_message',
                        from: 'Sistema',
                        message: `O anfitrião, ${oldHostName}, saiu. ${newHost.name} agora é o novo anfitrião.`,
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
                    players: remainingPlayers.map(p => ({ id: p.id, name: p.name })),

                },
            };
            roomManager.broadcastToRoom(
                room.id,
                JSON.stringify(roomInfoPayload)
            );
        } else {
            console.log(`Sala ${room.id} está vazia e será removida.`);
            roomManager.removeRoom(room.id);
        }
        broadcastRoomListUpdateToLobby(activeConnections);
        return;
    }

    if (room.state === "in_progress" && room.gameState) {
        console.log(
            `Jogador ${user.name} desconectou-se durante o jogo na sala ${room.id}.`
        );

        sendGameNotification(
            room.id,
            "Jogador Desconectado",
            `🏃‍♂️ ${user.name} perdeu a conexão.`,
            5000
        );

        room.removePlayer(user.id);

        const disconnectGameMessage = {
            event: 'chat_message',
            from: 'Sistema',
            message: `${user.name} perdeu a conexão.`,
            isSystemMessage: true
        };
        roomManager.broadcastToRoom(room.id, JSON.stringify(disconnectGameMessage));

        if (wasHost && room.getPlayers().length > 0) {
            room.promoteNextHost();
            const newHost = room.players.get(room.hostId!);
            if (newHost) {
                const promotionMessage = {
                    event: 'chat_message',
                    from: 'Sistema',
                    message: `O anfitrião, ${oldHostName}, perdeu a conexão. ${newHost.name} agora é o novo anfitrião.`,
                    isSystemMessage: true
                };
                roomManager.broadcastToRoom(room.id, JSON.stringify(promotionMessage));
            }
        }

        if (room.gameState.players.length <= 2) {
            console.log(
                `[Sala ${room.id}] Apenas 2 jogadores restavam. Iniciando timer de 1 minuto para encerrar o jogo.`
            );

            sendGameNotification(
                room.id,
                "Aguardando Jogador",
                `O jogo será encerrado em 1 minuto se ${user.name} não retornar.`,
                6000
            );

            const timer = setTimeout(() => {
                if (!room.disconnectedPlayers.has(user.id)) return;

                console.log(
                    `[Sala ${room.id}] Jogador não retornou. Encerrando jogo.`
                );

                sendGameNotification(
                    room.id,
                    "Jogo Encerrado",
                    `👋 ${user.name} não retornou.`,
                    5000
                );

                room.endGame();
                roomManager.broadcastToRoom(
                    room.id,
                    JSON.stringify({
                        event: "game_ended_by_disconnection",
                        payload: {
                            message:
                                "O outro jogador saiu. O jogo foi encerrado.",
                        },
                    })
                );
                const host = room.players.get(room.hostId!);
                const remainingPlayers = room.getPlayers();

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
                roomManager.broadcastToRoom(
                    room.id,
                    JSON.stringify(roomInfoPayload)
                );
                broadcastRoomListUpdateToLobby(activeConnections);

                if (room.getPlayers().length === 0) {
                    roomManager.removeRoom(room.id);
                }
            }, 60000);
            room.disconnectedPlayers.set(user.id, { timer, votes: new Set() });
        } else {
            console.log(
                `[Sala ${room.id}] Votação para expulsar ${user.name} disponível por 1 minuto.`
            );

            sendGameNotification(
                room.id,
                "Votação Disponível",
                `Uma votação para remover ${user.name} está disponível por 1 minuto.`,
                6000
            );

            const message = JSON.stringify({
                event: "game_event",
                payload: {
                    type: "player_disconnected_ingame",
                    payload: { playerId: user.id, playerName: user.name },
                },
            });
            roomManager.broadcastToRoom(room.id, message);

            const timer = setTimeout(() => {
                if (!room.disconnectedPlayers.has(user.id)) return;

                console.log(
                    `[Sala ${room.id}] Jogador ${user.name} não retornou a tempo e foi removido.`
                );

                sendGameNotification(
                    room.id,
                    "Jogador Removido",
                    `❌ ${user.name} não retornou a tempo e foi removido.`,
                    5000
                );

                const turnNeedsPassing = room.removePlayerFromGame(user.id);

                roomManager.broadcastToRoom(
                    room.id,
                    JSON.stringify({
                        event: "game_event",
                        payload: {
                            type: "player_removed_ingame",
                            payload: {
                                playerId: user.id,
                                playerName: user.name,
                            },
                        },
                    })
                );

                if (turnNeedsPassing) {
                    passTurn(room);
                } else {
                    roomManager.broadcastToRoom(
                        room.id,
                        JSON.stringify({
                            event: "gameStateUpdate",
                            payload: {
                                type: "gameStateUpdate",
                                payload: room.gameState!,
                            },
                        })
                    );
                }
            }, 60000);
            room.disconnectedPlayers.set(user.id, { timer, votes: new Set() });
        }
    }
}