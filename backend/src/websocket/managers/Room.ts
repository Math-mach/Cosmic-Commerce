import { ConnectedUser } from '../index';
import { gameDefinitions, mapa } from '../game/gameData';

interface TurnInfo {
  fase_do_turno: string;
  turno_atual: number;
  id_jogador_da_vez: string;
  passosRestantes?: number;
  opcoesBifurcacao?: number[];
}

interface PlayerState {
  id: string;
  nome: string;
  posicao_mapa_id: number;
  moedas: number;
  fragmentos: number;
  itens: string[];
}

interface ShopState {
  nodeId: number;
  items: string[];
}

interface GameState {
  players: PlayerState[];
  turnInfo: TurnInfo;
  lojas: ShopState[];
}

export class Room {
  id: string;
  name: string;
  players: Map<string, ConnectedUser>;
  maxPlayers: number;
  isPublic: boolean;

  public hostId: string | null = null;
  public state: 'waiting' | 'in_progress' | 'finished' = 'waiting';
  public gameState: GameState | null = null;

  constructor(id: string, name: string, isPublic: boolean = true, maxPlayers: number = 4) {
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
      console.log(`[Sala ${this.id}] Host migrado para ${nextHost.name} (${nextHost.id}).`);
    } else {
      this.hostId = null;
    }
  }

  addPlayer(user: ConnectedUser) {
    if (this.players.size >= this.maxPlayers) {
      throw new Error('A sala está cheia.');
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

  private initializeShops(): ShopState[] {
    const shopNodes = mapa.filter(node => node.tipoCasa === 'amarela');
    const allItemIds = Object.keys(gameDefinitions.itens);
    const shops: ShopState[] = [];

    for (const shopNode of shopNodes) {
      const shopItems = [...allItemIds].sort(() => 0.5 - Math.random()).slice(0, 3);
      shops.push({ nodeId: shopNode.id, items: shopItems });
    }
    console.log(`[Sala ${this.id}] Lojas inicializadas:`, shops);
    return shops;
  }

  startGame() {
    if (this.players.size < 2) {
      throw new Error('São necessários pelo menos 2 jogadores.');
    }
    this.state = 'in_progress';
    this.isPublic = false;

    const players = this.getPlayers();
    this.gameState = {
      players: players.map(p => ({
        id: p.id,
        nome: p.name,
        posicao_mapa_id: 0,
        moedas: 10,
        fragmentos: 0,
        itens: [],
      })),
      turnInfo: {
        fase_do_turno: 'uso_item_pre_rolagem',
        turno_atual: 1,
        id_jogador_da_vez: players[0].id,
        passosRestantes: 0,
        opcoesBifurcacao: [],
      },
      lojas: this.initializeShops(),
    };
  }
}
