import { ConnectedUser } from "../index";

export class Room {
    id: string;
    name: string;
    players: Map<string, ConnectedUser>;
    maxPlayers: number;
    isPublic: boolean;

    public state: "waiting" | "in_progress" | "finished" = "waiting";

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
        if (this.players.size < 3) {
            throw new Error("São necessários pelo menos 3 jogadores.");
        }
        this.state = "in_progress";
        this.isPublic = false;
    }
}
