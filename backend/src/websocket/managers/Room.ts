import { ConnectedUser } from "../index";
import { passTurn } from "../game/playerAction.handler";

interface TurnInfo {
    fase_do_turno: string;
    turno_atual: number;
    id_jogador_da_vez: string;
    passosRestantes?: number;
    opcoesBifurcacao?: number[];
}

interface GameState {
    players: any[];
    turnInfo: any;
}

interface DisconnectedPlayerInfo {
    timer: NodeJS.Timeout;
    votes: Set<string>; // Set of user IDs who voted
}

export class Room {
    id: string;
    name: string;
    players: Map<string, ConnectedUser>;
    maxPlayers: number;
    isPublic: boolean;

    public hostId: string | null = null;
    public state: "waiting" | "in_progress" | "finished" = "waiting";
    public gameState: GameState | null = null;
    public disconnectedPlayers: Map<string, DisconnectedPlayerInfo> = new Map();

    constructor(
        id: string,
        name: string,
        isPublic: boolean = true,
        maxPlayers: number = 4
    ) {
        this.id = id;
        this.name = name;
        this.players = new Map();
        this.maxPlayers = maxPlayers;
        this.isPublic = isPublic;
    }

    public promoteNextHost(): void {
        if (this.players.size > 0) {
            const nextHost = this.getPlayers()[0];
            this.hostId = nextHost.id;
            console.log(
                `[Sala ${this.id}] Host migrado para ${nextHost.name} (${nextHost.id}).`
            );
        } else {
            this.hostId = null;
        }
    }

    addPlayer(user: ConnectedUser) {
        if (this.players.size >= this.maxPlayers) {
            throw new Error("A sala está cheia.");
        }
        if (this.players.size === 0) {
            this.hostId = user.id;
        }
        this.players.set(user.id, user);
        user.roomId = this.id;
    }

    removePlayer(userId: string) {
        const user = this.players.get(userId);
        if (user) {
            user.roomId = null;
            this.players.delete(userId);
        }
    }

    getPlayers(): ConnectedUser[] {
        return Array.from(this.players.values());
    }

    startGame() {
        if (this.players.size < 2) {
            throw new Error("São necessários pelo menos 2 jogadores.");
        }
        this.state = "in_progress";
        this.isPublic = false;

        const players = this.getPlayers();
        this.gameState = {
            players: players.map((p) => ({
                id: p.id,
                nome: p.name,
                posicao_mapa_id: 0,
                moedas: 10,
                fragmentos: 0,
            })),
            turnInfo: {
                fase_do_turno: "uso_item_pre_rolagem",
                turno_atual: 1,
                id_jogador_da_vez: players[0].id,
                passosRestantes: 0,
                opcoesBifurcacao: [],
            },
        };
    }

    /**
     * Encerra um jogo em andamento, resetando a sala para o estado de "espera".
     */
    public endGame() {
        this.state = "waiting";
        this.isPublic = true;
        this.gameState = null;

        // Limpa quaisquer timers de desconexão pendentes
        for (const disconnected of this.disconnectedPlayers.values()) {
            clearTimeout(disconnected.timer);
        }
        this.disconnectedPlayers.clear();
        console.log(`[Sala ${this.id}] Jogo encerrado, voltando para o lobby.`);
    }

    /**
     * Remove permanentemente um jogador do estado do jogo.
     * @param playerId O ID do jogador a ser removido.
     * @returns `true` se era o turno do jogador removido, indicando que o turno precisa ser passado.
     */
    public removePlayerFromGame(playerId: string): boolean {
        if (!this.gameState) return false;

        const wasTheirTurn =
            this.gameState.turnInfo.id_jogador_da_vez === playerId;
        const playerIndex = this.gameState.players.findIndex(
            (p) => p.id === playerId
        );

        if (playerIndex > -1) {
            const removedPlayerName = this.gameState.players[playerIndex].nome;
            this.gameState.players.splice(playerIndex, 1);
            console.log(
                `[Sala ${this.id}] Jogador ${removedPlayerName} removido permanentemente do jogo.`
            );

            // Limpa as informações de desconexão pendentes
            if (this.disconnectedPlayers.has(playerId)) {
                const info = this.disconnectedPlayers.get(playerId)!;
                clearTimeout(info.timer);
                this.disconnectedPlayers.delete(playerId);
            }

            return wasTheirTurn;
        }
        return false;
    }
}
