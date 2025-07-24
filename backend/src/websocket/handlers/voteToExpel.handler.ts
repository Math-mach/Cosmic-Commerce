import { ConnectedUser } from "..";
import { roomManager, sendGameNotification } from "../managers/roomManager";
import { passTurn } from "../game/playerAction.handler";

export function handleVoteToExpel(
    user: ConnectedUser,
    payload: { playerIdToExpel: string }
) {
    if (!user.roomId || !payload || !payload.playerIdToExpel) {
        return;
    }

    const room = roomManager.findRoomById(user.roomId);
    if (!room || room.state !== "in_progress" || !room.gameState) {
        return;
    }

    const disconnectedInfo = room.disconnectedPlayers.get(
        payload.playerIdToExpel
    );
    if (!disconnectedInfo) {
        return;
    }

    if (
        user.id === payload.playerIdToExpel ||
        disconnectedInfo.votes.has(user.id)
    ) {
        return;
    }

    disconnectedInfo.votes.add(user.id);
    const voterName = room.gameState.players.find(
        (p) => p.id === user.id
    )?.nome;
    console.log(
        `[Sala ${room.id}] ${voterName} votou para expulsar. Total de votos: ${disconnectedInfo.votes.size}`
    );

    roomManager.broadcastToRoom(
        room.id,
        JSON.stringify({
            event: "game_event",
            payload: {
                type: "vote_update",
                payload: {
                    votedFor: payload.playerIdToExpel,
                    votes: disconnectedInfo.votes.size,
                },
            },
        })
    );

    const connectedPlayersCount = room.getPlayers().length;
    const majority = Math.floor(connectedPlayersCount / 2) + 1;

    if (disconnectedInfo.votes.size >= majority) {
        const playerToExpel = room.gameState.players.find(
            (p) => p.id === payload.playerIdToExpel
        );
        console.log(
            `[Sala ${room.id}] Votação para expulsar ${playerToExpel?.nome} atingiu a maioria.`
        );

        sendGameNotification(
            room.id,
            "Jogador Removido por Votação",
            `⚖️ ${playerToExpel?.nome || "O jogador"} foi removido da partida.`,
            5000
        );

        const turnNeedsPassing = room.removePlayerFromGame(
            payload.playerIdToExpel
        );

        roomManager.broadcastToRoom(
            room.id,
            JSON.stringify({
                event: "game_event",
                payload: {
                    type: "player_removed_by_vote",
                    payload: {
                        playerId: payload.playerIdToExpel,
                        playerName:
                            playerToExpel?.nome || "Jogador Desconhecido",
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
    }
}
