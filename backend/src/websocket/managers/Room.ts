import { ConnectedUser } from "../index";

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

export class Room {
    id: string;
    name: string;
    players: Map<string, ConnectedUser>;
    maxPlayers: number;
    isPublic: boolean;

    public state: "waiting" | "in_progress" | "finished" = "waiting";

    public gameState: GameState | null = null;

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

    addPlayer(user: ConnectedUser) {
        if (this.players.size >= this.maxPlayers) {
            throw new Error("A sala está cheia.");
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
}
