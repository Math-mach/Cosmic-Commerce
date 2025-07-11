import { ConnectedUser } from '../index';
import { gameDefinitions, mapa } from '../game/gameData';

interface TurnInfo {
  fase_do_turno: string;
  turno_atual: number;
  id_jogador_da_vez: string;
  itemUsedThisTurn?: boolean;
  itemUsedId?: string;
  passosRestantes?: number;
  passosRestantesAposLoja?: number;
  opcoesBifurcacao?: number[];
}

interface PlayerEffect {
  id: string;
  turnos_restantes: number;
}

interface PlayerState {
  id: string;
  nome: string;
  posicao_mapa_id: number;
  moedas: number;
  fragmentos: number;
  itens: string[];
  efeitos_ativos: PlayerEffect[];
}

interface ShopState {
  nodeId: number;
  items: string[];
}

interface GameState {
  players: PlayerState[];
  turnInfo: TurnInfo;
  lojas: ShopState[];
  posicaoFragmentoEstrelaId: number;
}

interface DisconnectedPlayerInfo {
  timer: NodeJS.Timeout;
  votes: Set<string>;
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
  public disconnectedPlayers: Map<string, DisconnectedPlayerInfo> = new Map();

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
    const fullShopInventory = [
      'dado_adicional',
      'cogumelo_venenoso',
      'item_de_teleporte',
      'ladrao_de_moedas',
    ];

    // Agora cria uma loja para CADA casa amarela encontrada.
    return shopNodes.map(shopNode => ({
      nodeId: shopNode.id,
      items: fullShopInventory,
    }));
  }

  public realocateStarFragment() {
    if (!this.gameState) return;

    const casasInvalidas = ['roxa', 'amarela', 'cinza'];

    const possibleNodes = mapa
      .filter(node => node.id >= 15 && !casasInvalidas.includes(node.tipoCasa!))
      .map(node => node.id);

    const randomIndex = Math.floor(Math.random() * possibleNodes.length);
    const newStarNodeId = possibleNodes[randomIndex];
    this.gameState.posicaoFragmentoEstrelaId = newStarNodeId;
    console.log(`[Sala ${this.id}] Fragmento de Estrela realocado para o nó ${newStarNodeId}.`);
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
        moedas: 20,
        fragmentos: 0,
        itens: ['dado_adicional', 'cogumelo_venenoso', 'ladrao_de_moedas', 'item_de_teleporte'],
        efeitos_ativos: [],
      })),
      turnInfo: {
        fase_do_turno: 'uso_item_pre_rolagem',
        turno_atual: 1,
        id_jogador_da_vez: players[0].id,
        itemUsedThisTurn: false,
        passosRestantes: 0,
        passosRestantesAposLoja: 0,
        opcoesBifurcacao: [],
      },
      lojas: this.initializeShops(),
      posicaoFragmentoEstrelaId: 0,
    };

    this.realocateStarFragment();
  }

  public endGame() {
    this.state = 'waiting';
    this.isPublic = true;
    this.gameState = null;
    for (const disconnected of this.disconnectedPlayers.values()) {
      clearTimeout(disconnected.timer);
    }
    this.disconnectedPlayers.clear();
    console.log(`[Sala ${this.id}] Jogo encerrado, voltando para o lobby.`);
  }

  public removePlayerFromGame(playerId: string): boolean {
    if (!this.gameState) return false;
    const wasTheirTurn = this.gameState.turnInfo.id_jogador_da_vez === playerId;
    const playerIndex = this.gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex > -1) {
      const removedPlayerName = this.gameState.players[playerIndex].nome;
      this.gameState.players.splice(playerIndex, 1);
      console.log(
        `[Sala ${this.id}] Jogador ${removedPlayerName} removido permanentemente do jogo.`
      );
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
