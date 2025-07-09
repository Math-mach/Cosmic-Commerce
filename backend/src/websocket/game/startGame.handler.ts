import { ConnectedUser } from "..";
import { roomManager } from "../managers/roomManager";

interface PlayerState {
    id: string;
    nome: string;
    posicao_mapa_id: number;
    moedas: number;
    fragmentos: number;
    // itens: any[];
}
interface TurnInfo {
    fase_do_turno: string;
    turno_atual: number;
    id_jogador_da_vez: string;
}
interface GameState {
    players: PlayerState[];
    turnInfo: TurnInfo;
}

export function handleStartGame(user: ConnectedUser) {
    const { roomId, name } = user;

    if (!roomId) {
        user.ws.send(
            JSON.stringify({
                event: "error",
                message: "Você não está em uma sala.",
            })
        );
        return;
    }

    const room = roomManager.findRoomById(roomId);
    if (!room) {
        user.ws.send(
            JSON.stringify({ event: "error", message: "Sala não encontrada." })
        );
        return;
    }

    try {
        room.startGame();
    } catch (error: any) {
        user.ws.send(
            JSON.stringify({
                event: "error",
                message: `Não foi possível iniciar o jogo: ${error.message}`,
            })
        );
        return;
    }

    console.log(
        `🎮 Jogo iniciado na sala ${room.name} (${roomId}) por ${name}.`
    );

    const initialPlayers = room.getPlayers().map((p) => ({
        id: p.id,
        nome: p.name,
        posicao_mapa_id: 0,
        moedas: 10,
        fragmentos: 0,
    }));

    const initialTurnInfo = {
        fase_do_turno: "uso_item_pre_rolagem",
        turno_atual: 1,
        id_jogador_da_vez: initialPlayers[0].id,
    };

    const initialGameState: GameState = {
        players: initialPlayers,
        turnInfo: initialTurnInfo,
    };

    const gameStartedPayload = {
        event: "game_started",
        payload: initialGameState,
    };

    roomManager.broadcastToRoom(roomId, JSON.stringify(gameStartedPayload));
}
