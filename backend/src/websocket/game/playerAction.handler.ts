import { ConnectedUser } from '..';
import { roomManager } from '../managers/roomManager';
import { Room } from '../managers/Room';
import { findNodeById, gameDefinitions, MapNode } from './gameData';

// ===================================================================================
//  TIPOS E INTERFACE
// ===================================================================================

interface PlayerActionPayload {
  action:
  | 'main_button_click'
  | 'choose_path'
  | 'buy_item'
  | 'close_shop'
  | 'pay_to_avoid_catastrophe'
  | 'face_the_catastrophe'
  | 'use_item'
  | 'buy_star_fragment'
  | 'ignore_star_fragment';
  nodeId?: number;
  itemId?: string;
  targetPlayerId?: string;
  [key: string]: any;
}

// ===================================================================================
//  GERENCIAMENTO DO TIMER DE AÇÃO
// ===================================================================================

const ACTION_TIMEOUT = 15000; // 15 segundos

export function clearActionTimer(room: Room) {
  if (room.actionTimer) {
    clearTimeout(room.actionTimer);
    room.actionTimer = null;
  }
}

export function startActionTimer(room: Room, onTimeout: () => void, duration: number = ACTION_TIMEOUT) {
  clearActionTimer(room);

  room.actionTimerStartTime = Date.now();
  room.actionTimerRemaining = duration;

  room.actionTimer = setTimeout(() => {
    console.log(`[Sala ${room.id}] Tempo de ação esgotado. Executando ação padrão.`);
    onTimeout();
  }, duration);
}

export function pauseActionTimer(room: Room) {
  if (!room.actionTimer || !room.actionTimerStartTime) return;

  clearTimeout(room.actionTimer);
  const timeElapsed = Date.now() - room.actionTimerStartTime;
  const timeRemaining = room.actionTimerRemaining! - timeElapsed;

  room.actionTimerRemaining = Math.max(0, timeRemaining); // Garante que não seja negativo
  room.actionTimer = null;
  room.actionTimerStartTime = null;

  console.log(`[Sala ${room.id}] Timer de ação pausado com ${Math.round(room.actionTimerRemaining / 1000)}s restantes.`);
}

export function resumeActionTimer(room: Room) {
  if (room.actionTimer || room.actionTimerRemaining === null) return; // Se já estiver rodando ou não houver tempo, não faz nada

  const { turnInfo } = room.gameState!;
  const currentPlayer = room.players.get(turnInfo.id_jogador_da_vez)!;
  let onTimeoutCallback: () => void;

  // Determina a ação de timeout com base na fase atual
  switch (turnInfo.fase_do_turno) {
    case 'uso_item_pre_rolagem':
      onTimeoutCallback = () => handleMainButtonClick(room);
      break;
    case 'escolha_bifurcacao':
      onTimeoutCallback = () => {
        const defaultPath = turnInfo.opcoesBifurcacao![0];
        handleChoosePath(room, currentPlayer.id, defaultPath);
      };
      break;

    // =======================================================
    // ===== CASOS FALTANTES ADICIONADOS AQUI ABAIXO =====
    // =======================================================
    case 'em_loja':
      onTimeoutCallback = () => handleCloseShop(room, currentPlayer);
      break;
    case 'escolha_catastrofe':
      onTimeoutCallback = () => handlePayToAvoidCatastrophe(room, currentPlayer);
      break;
    case 'decisao_fragmento':
      onTimeoutCallback = () => handleIgnoreStarFragment(room, currentPlayer);
      break;
    default:
      console.log(`[Sala ${room.id}] Não é possível resumir o timer na fase ${turnInfo.fase_do_turno}`);
      return;
  }

  console.log(`[Sala ${room.id}] Retomando timer de ação com ${Math.round(room.actionTimerRemaining / 1000)}s.`);
  startActionTimer(room, onTimeoutCallback, room.actionTimerRemaining);
}

// ===================================================================================
//  FUNÇÃO PRINCIPAL (ROTEADOR DE AÇÕES)
// ===================================================================================

export function handlePlayerAction(user: ConnectedUser, payload: PlayerActionPayload) {
  const { roomId, id: userId, ws } = user;
  const room = roomManager.findRoomById(roomId || '');

  if (!room || room.state !== 'in_progress' || !room.gameState) {
    ws.send(JSON.stringify({ event: 'error', message: 'O jogo não está ativo.' }));
    return;
  }

  const nonTurnActions = [
    'close_shop',
    'buy_item',
    'pay_to_avoid_catastrophe',
    'face_the_catastrophe',
    'use_item',
    'buy_star_fragment',
    'ignore_star_fragment',
  ];

  if (payload.action === 'use_item' && room.gameState.turnInfo.id_jogador_da_vez !== userId) {
    ws.send(JSON.stringify({ event: 'error', message: 'Você só pode usar itens no seu turno.' }));
    return;
  }

  if (
    !nonTurnActions.includes(payload.action) &&
    room.gameState.turnInfo.id_jogador_da_vez !== userId
  ) {
    ws.send(JSON.stringify({ event: 'error', message: 'Não é a sua vez de jogar.' }));
    return;
  }

  clearActionTimer(room);

  switch (payload.action) {
    case 'main_button_click':
      handleMainButtonClick(room);
      break;
    case 'choose_path':
      handleChoosePath(room, user.id, payload.nodeId!);
      break;
    case 'buy_item':
      handleBuyItem(room, user, payload.itemId!);
      break;
    case 'close_shop':
      handleCloseShop(room, user);
      break;
    case 'pay_to_avoid_catastrophe':
      handlePayToAvoidCatastrophe(room, user);
      break;
    case 'face_the_catastrophe':
      handleFaceTheCatastrophe(room, user);
      break;
    case 'use_item':
      handleUseItem(room, user, payload.itemId!, payload.targetPlayerId);
      break;
    case 'buy_star_fragment':
      handleBuyStarFragment(room, user);
      break;
    case 'ignore_star_fragment':
      handleIgnoreStarFragment(room, user);
      break;
    default:
      ws.send(JSON.stringify({ event: 'error', message: `Ação desconhecida: ${payload.action}` }));
      break;
  }
}

// ===================================================================================
//  LÓGICA DE TURNO
// ===================================================================================

export function passTurn(room: Room) {
  if (!room.gameState || room.gameState.players.length === 0) {
    console.warn(`[Sala ${room.id}] Tentativa de passar turno sem jogadores. Encerrando jogo.`);
    room.endGame();
    roomManager.broadcastToRoom(
      room.id,
      JSON.stringify({
        event: 'game_ended_by_error',
        payload: { message: 'O jogo terminou devido a um erro inesperado.' },
      })
    );
    return;
  }

  const players = room.gameState.players;
  const { turnInfo } = room.gameState!;
  const currentPlayerId = turnInfo.id_jogador_da_vez;
  const currentPlayerIndex = players.findIndex(p => p.id === currentPlayerId);

  if (turnInfo.turno_atual >= room.MAX_TURNS && currentPlayerIndex === players.length - 1) {
    console.log(`[Sala ${room.id}] Turno final ${room.MAX_TURNS} concluído. Encerrando o jogo.`);
    const finalPayload = room.calculateAwards();
    if (finalPayload) {
      roomManager.broadcastToRoom(room.id, JSON.stringify(finalPayload));
    }
    room.endGame();
    setTimeout(() => {
      const host = room.players.get(room.hostId!);
      const roomInfoPayload = {
        event: 'room_info',
        room: {
          id: room.id,
          name: room.name,
          hostName: host?.name || 'N/D',
          current_users: room.getPlayers().length,
          max_users: room.maxPlayers,
          players: room.getPlayers().map(p => ({ id: p.id, name: p.name })),
        },
      };
      roomManager.broadcastToRoom(room.id, JSON.stringify(roomInfoPayload));
    }, 10000);
    return;
  }

  const nextPlayerIndex = currentPlayerIndex === -1 ? 0 : (currentPlayerIndex + 1) % players.length;
  const nextPlayer = players[nextPlayerIndex];

  const teiaEffect = nextPlayer.efeitos_ativos.find(e => e.id === 'preso_na_teia');
  if (teiaEffect) {
    nextPlayer.efeitos_ativos = nextPlayer.efeitos_ativos.filter(e => e.id !== 'preso_na_teia');
    roomManager.broadcastToRoom(
      room.id,
      JSON.stringify({
        event: 'game_event',
        payload: {
          type: 'show_notification',
          payload: {
            title: 'Preso na Teia!',
            message: `${nextPlayer.nome} está preso e perdeu a vez!`,
            duration: 4000,
            isEvent: true,
          },
        },
      })
    );
    turnInfo.id_jogador_da_vez = nextPlayer.id;
    setTimeout(() => passTurn(room), 1500);
    return;
  }

  turnInfo.id_jogador_da_vez = nextPlayer.id;
  turnInfo.fase_do_turno = 'uso_item_pre_rolagem';
  turnInfo.itemUsedThisTurn = false;
  turnInfo.itemUsedId = undefined;
  turnInfo.passosRestantes = 0;
  turnInfo.opcoesBifurcacao = [];
  turnInfo.passosRestantesAposLoja = 0;

  if (nextPlayerIndex === 0 && currentPlayerIndex !== -1) {
    turnInfo.turno_atual++;
  }

  console.log(`[Sala ${room.id}] Turno passado para ${nextPlayer.nome}.`);

  const updatePayload = {
    event: 'gameStateUpdate',
    payload: { type: 'gameStateUpdate', payload: room.gameState! },
  };
  roomManager.broadcastToRoom(room.id, JSON.stringify(updatePayload));
  startActionTimer(room, () => {
    console.log(`[Timer Sala ${room.id}] Jogador ${nextPlayer.nome} não rolou o dado. Rolando automaticamente.`);
    handleMainButtonClick(room);
  });
}

// ===================================================================================
//  LÓGICA DE MOVIMENTO
// ===================================================================================

export function handleMainButtonClick(room: Room) {
  const { turnInfo, players } = room.gameState!;
  const currentPlayer = players.find(p => p.id === turnInfo.id_jogador_da_vez)!;

  if (turnInfo.fase_do_turno !== 'uso_item_pre_rolagem') return;

  turnInfo.fase_do_turno = 'rolagem_dado';

  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({
      event: 'gameStateUpdate',
      payload: { type: 'gameStateUpdate', payload: room.gameState! },
    })
  );

  const dadoAdicionalEffect = currentPlayer.efeitos_ativos.find(e => e.id === 'dado_adicional');
  const cogumeloEffect = currentPlayer.efeitos_ativos.find(e => e.id === 'cogumelo_venenoso');
  let dadoComum = 0;
  let dadoExtra = 0;

  if (cogumeloEffect) {
    dadoComum = Math.floor(Math.random() * 3) + 1;
    currentPlayer.efeitos_ativos = currentPlayer.efeitos_ativos.filter(
      e => e.id !== 'cogumelo_venenoso'
    );
  } else {
    dadoComum = Math.floor(Math.random() * 10) + 1;
  }

  if (dadoAdicionalEffect) {
    dadoExtra = Math.floor(Math.random() * 10) + 1;
    currentPlayer.efeitos_ativos = currentPlayer.efeitos_ativos.filter(
      e => e.id !== 'dado_adicional'
    );
  }

  let diceRoll = dadoComum + dadoExtra;

  const botaJatoEffect = currentPlayer.efeitos_ativos.find(e => e.id === 'bota_a_jato');
  if (botaJatoEffect) {
    if (diceRoll < 4) diceRoll = 4;
    currentPlayer.efeitos_ativos = currentPlayer.efeitos_ativos.filter(e => e.id !== 'bota_a_jato');
  }

  const energeticoEffect = currentPlayer.efeitos_ativos.find(e => e.id === 'energetico_cosmico');
  if (energeticoEffect) {
    diceRoll = diceRoll * 2;
    currentPlayer.efeitos_ativos = currentPlayer.efeitos_ativos.filter(
      e => e.id !== 'energetico_cosmico'
    );
  }

  continueMovement(room, diceRoll, diceRoll);
}

function handleChoosePath(room: Room, userId: string, chosenNodeId: number) {
  clearActionTimer(room);
  const { turnInfo, players } = room.gameState!;
  if (turnInfo.fase_do_turno !== 'escolha_bifurcacao') return;

  const currentPlayerState = players.find(p => p.id === userId)!;
  const bifurcationNode = findNodeById(currentPlayerState.posicao_mapa_id)!;
  if (!bifurcationNode.conexoes.includes(chosenNodeId)) return;

  const stepsRemainingAfterChoice = turnInfo.passosRestantes!;
  turnInfo.opcoesBifurcacao = [];
  turnInfo.fase_do_turno = 'movimento';
  currentPlayerState.posicao_mapa_id = chosenNodeId;

  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({
      event: 'gameStateUpdate',
      payload: { type: 'gameStateUpdate', payload: room.gameState! },
    })
  );

  continueMovement(room, stepsRemainingAfterChoice, stepsRemainingAfterChoice);
}

// ===================================================================================
//  LÓGICA DE MOVIMENTO (CORRIGIDA)
// ===================================================================================
function continueMovement(room: Room, stepsToTake: number, initialDiceRoll: number | null = null) {
  const { turnInfo, players, posicaoFragmentoEstrelaId } = room.gameState!;
  const currentPlayer = players.find(p => p.id === turnInfo.id_jogador_da_vez)!;

  if (stepsToTake <= 0) {
    processEndOfMovement(room, currentPlayer.posicao_mapa_id);
    return;
  }

  // 1. Gerar o caminho completo que o jogador percorreria com o dado.
  let tempNode = findNodeById(currentPlayer.posicao_mapa_id);
  const fullPathNodes: MapNode[] = [tempNode!];
  for (let i = 0; i < stepsToTake; i++) {
    if (!tempNode || !tempNode.conexoes[0]) break; // Para se chegar a um beco sem saída.
    tempNode = findNodeById(tempNode.conexoes[0]);
    if (!tempNode) break;
    fullPathNodes.push(tempNode);
  }

  // 2. Analisar o caminho gerado para encontrar o PRIMEIRO ponto de parada.
  let stopIndex = -1;
  let movementStopsAtStar = false;
  let movementStopsAtShop = false;
  let movementStopsAtBifurcation = false;

  // Começa em 1 para ignorar a casa atual do jogador.
  for (let i = 1; i < fullPathNodes.length; i++) {
    const pathNode = fullPathNodes[i];

    // A estrela tem a maior prioridade.
    if (pathNode.id === posicaoFragmentoEstrelaId) {
      stopIndex = i;
      movementStopsAtStar = true;
      turnInfo.passosRestantesAposLoja = stepsToTake - i;
      break;
    }
    // Em seguida, a loja.
    if (pathNode.tipoCasa === 'amarela') {
      stopIndex = i;
      movementStopsAtShop = true;
      turnInfo.passosRestantesAposLoja = stepsToTake - i;
      break;
    }
    // Por último, a bifurcação.
    if (pathNode.tipo === 'bifurcacao') {
      stopIndex = i;
      movementStopsAtBifurcation = true;
      turnInfo.passosRestantes = stepsToTake - i;
      turnInfo.opcoesBifurcacao = pathNode.conexoes;
      break;
    }
  }

  // 3. Determinar o caminho final para a animação.
  const finalPath = stopIndex !== -1 ? fullPathNodes.slice(0, stopIndex + 1) : fullPathNodes;
  const finalPathIds = finalPath.map(node => node.id);

  // 4. Transmitir o evento e agendar a lógica de final de movimento.
  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({
      event: 'game_event',
      payload: {
        type: 'player_is_moving',
        payload: { playerId: currentPlayer.id, path: finalPathIds, diceResult: initialDiceRoll },
      },
    })
  );

  const finalNodeInPath = finalPath[finalPath.length - 1];
  const animationDuration = finalPath.length * 500 + (initialDiceRoll ? 500 : 0);

  setTimeout(() => {
    currentPlayer.posicao_mapa_id = finalNodeInPath.id;
    if (movementStopsAtStar) {
      triggerStarFragmentInteraction(room);
    } else if (movementStopsAtShop) {
      triggerShopInteraction(room, finalNodeInPath.id);
    } else if (movementStopsAtBifurcation) {
      turnInfo.fase_do_turno = 'escolha_bifurcacao';
      roomManager.broadcastToRoom(
        room.id,
        JSON.stringify({
          event: 'gameStateUpdate',
          payload: { type: 'gameStateUpdate', payload: room.gameState! },
        })
      );
      startActionTimer(room, () => {
        const defaultPathNodeId = room.gameState!.turnInfo.opcoesBifurcacao![0];
        console.log(`[Timer Sala ${room.id}] Jogador não escolheu o caminho. Escolhendo padrão: ${defaultPathNodeId}`);
        handleChoosePath(room, currentPlayer.id, defaultPathNodeId);
      });
    } else processEndOfMovement(room, finalNodeInPath.id);
  }, animationDuration);
}

function processEndOfMovement(room: Room, finalNodeId: number) {
  const { turnInfo, players: playerStates } = room.gameState!;
  const currentPlayerState = playerStates.find(p => p.id === turnInfo.id_jogador_da_vez)!;

  currentPlayerState.posicao_mapa_id = finalNodeId;
  turnInfo.fase_do_turno = 'aterrissagem';
  const finalNode = findNodeById(finalNodeId);
  let notificationPayload = null;

  if (finalNode?.tipoCasa) {
    const { tipoCasa } = finalNode;
    if (tipoCasa === 'azul' || tipoCasa === 'vermelha') {
      const { efeito } = gameDefinitions.casas[tipoCasa];
      if (efeito.tipo === 'ganhar_moedas') {
        currentPlayerState.moedas += efeito.valor_base;
        notificationPayload = {
          title: 'Casa Azul!',
          message: `Você ganhou ${efeito.valor_base} moedas!`,
        };
      } else {
        const moedasPerdidas = Math.min(currentPlayerState.moedas, efeito.valor_base);
        currentPlayerState.moedas -= moedasPerdidas;
        notificationPayload = {
          title: 'Casa Vermelha!',
          message: `Você perdeu ${moedasPerdidas} moedas!`,
        };
      }
    } else if (tipoCasa === 'verde') {
      const evento =
        gameDefinitions.eventos_casa_interrogacao[
        Math.floor(Math.random() * gameDefinitions.eventos_casa_interrogacao.length)
        ];
      notificationPayload = { title: evento.nome, message: evento.efeito_detalhado, isEvent: true };
      switch (evento.id) {
        case 'chuva_de_moedas':
          playerStates.forEach(p => (p.moedas += 5));
          break;
        case 'imposto_coletivo':
          playerStates.forEach(p => (p.moedas = Math.max(0, p.moedas - 5)));
          break;
        case 'roleta_da_sorte':
          currentPlayerState.moedas += 10;
          break;
      }
    } else if (tipoCasa === 'roxa') {
      turnInfo.fase_do_turno = 'escolha_catastrofe';
      roomManager.broadcastToRoom(
        room.id,
        JSON.stringify({
          event: 'gameStateUpdate',
          payload: { type: 'gameStateUpdate', payload: room.gameState! },
        })
      );
      roomManager.broadcastToRoom(
        room.id,
        JSON.stringify({
          event: 'game_event',
          payload: {
            type: 'show_catastrophe_modal',
            payload: { cost: gameDefinitions.casas.roxa.efeito.custo_para_evitar },
          },
        })
      );

      startActionTimer(room, () => {
        const user = room.players.get(turnInfo.id_jogador_da_vez)!;
        console.log(`[Timer Sala ${room.id}] Jogador não decidiu sobre a catástrofe. Acionando padrão.`);
        handlePayToAvoidCatastrophe(room, user); // Ação padrão é tentar pagar
      });
      return;
    }
  }

  if (!notificationPayload) {
    setTimeout(() => passTurn(room), 1000);
    return;
  }

  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({
      event: 'gameStateUpdate',
      payload: { type: 'gameStateUpdate', payload: room.gameState! },
    })
  );
  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({
      event: 'game_event',
      payload: { type: 'show_notification', payload: { ...notificationPayload, duration: 4000 } },
    })
  );
  setTimeout(() => passTurn(room), 4500);
}

// ===================================================================================
//  LÓGICA DE ITENS
// ===================================================================================

function handleUseItem(room: Room, user: ConnectedUser, itemId: string, targetPlayerId?: string) {
  const { gameState } = room;
  if (
    !gameState ||
    gameState.turnInfo.id_jogador_da_vez !== user.id ||
    gameState.turnInfo.fase_do_turno !== 'uso_item_pre_rolagem'
  )
    return;

  if (gameState.turnInfo.itemUsedThisTurn) {
    user.ws.send(JSON.stringify({ event: 'error', message: 'Você já usou um item neste turno.' }));
    return;
  }

  const playerState = gameState.players.find(p => p.id === user.id)!;
  const itemIndex = playerState.itens.indexOf(itemId);

  if (itemIndex === -1) {
    user.ws.send(JSON.stringify({ event: 'error', message: 'Você não possui este item.' }));
    return;
  }

  let notificationMessage = '';
  const itemDefinition = (gameDefinitions.itens as any)[itemId];

  switch (itemId) {
    case 'dado_adicional':
      playerState.efeitos_ativos.push({ id: 'dado_adicional', turnos_restantes: 1 });
      notificationMessage = `${playerState.nome} se preparou para rolar um dado extra!`;
      break;
    case 'bota_a_jato':
      playerState.efeitos_ativos.push({ id: 'bota_a_jato', turnos_restantes: 1 });
      notificationMessage = `${playerState.nome} equipou as Botas a Jato!`;
      break;
    case 'energetico_cosmico':
      playerState.efeitos_ativos.push({ id: 'energetico_cosmico', turnos_restantes: 1 });
      notificationMessage = `${playerState.nome} tomou um Energético Cósmico! Que dobra o resultado da sua próxima rolagem de dado`;
      break;

    case 'cogumelo_venenoso':
    case 'ladrao_de_moedas':
    case 'item_de_teleporte':
    case 'teia_cosmica':
      const targetPlayer = gameState.players.find(p => p.id === targetPlayerId);
      if (!targetPlayer || targetPlayer.id === user.id) {
        user.ws.send(JSON.stringify({ event: 'error', message: 'Alvo inválido.' }));
        return;
      }
      if (itemId === 'cogumelo_venenoso') {
        targetPlayer.efeitos_ativos.push({ id: 'cogumelo_venenoso', turnos_restantes: 1 });
        notificationMessage = `${playerState.nome} usou um Cogumelo Venenoso em ${targetPlayer.nome}!`;
      } else if (itemId === 'ladrao_de_moedas') {
        const moedasRoubadas = Math.min(targetPlayer.moedas, 10);
        targetPlayer.moedas -= moedasRoubadas;
        notificationMessage = `${playerState.nome} usou um Ladrão de Moedas em ${targetPlayer.nome} e roubou ${moedasRoubadas} moedas!`;
      } else if (itemId === 'item_de_teleporte') {
        const pos1 = playerState.posicao_mapa_id;
        const pos2 = targetPlayer.posicao_mapa_id;
        playerState.posicao_mapa_id = pos2;
        targetPlayer.posicao_mapa_id = pos1;
        notificationMessage = `${playerState.nome} usou um Teleporte e trocou de lugar com ${targetPlayer.nome}!`;
      } else if (itemId === 'teia_cosmica') {
        targetPlayer.efeitos_ativos.push({ id: 'preso_na_teia', turnos_restantes: 1 });
        notificationMessage = `${playerState.nome} prendeu ${targetPlayer.nome} em uma Teia Cósmica!`;
      }
      break;
  }

  playerState.itens.splice(itemIndex, 1);
  gameState.turnInfo.itemUsedThisTurn = true;
  gameState.turnInfo.itemUsedId = itemId;

  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({
      event: 'game_event',
      payload: {
        type: 'show_notification',
        payload: {
          title: itemDefinition.nome,
          message: notificationMessage,
          duration: 4000,
          isEvent: true,
        },
      },
    })
  );
  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({
      event: 'gameStateUpdate',
      payload: { type: 'gameStateUpdate', payload: room.gameState! },
    })
  );
}

function handleBuyItem(room: Room, user: ConnectedUser, itemId: string) {
  const { gameState } = room;
  if (
    !gameState ||
    gameState.turnInfo.fase_do_turno !== 'em_loja' ||
    gameState.turnInfo.id_jogador_da_vez !== user.id
  )
    return;

  const playerState = gameState.players.find(p => p.id === user.id)!;
  const itemDefinition = (gameDefinitions.itens as any)[itemId];
  if (!itemDefinition) return;

  if (playerState.moedas < itemDefinition.preco) {
    roomManager.sendToUser(user.id, {
      event: 'game_event',
      payload: {
        type: 'show_notification',
        payload: {
          title: 'Saldo Insuficiente',
          message: 'Você não tem moedas para comprar este item.',
          duration: 3000,
        },
      },
    });
    return;
  }
  if (playerState.itens.length >= 4) {
    roomManager.sendToUser(user.id, {
      event: 'game_event',
      payload: {
        type: 'show_notification',
        payload: {
          title: 'Inventário Cheio',
          message: 'Você não tem espaço para mais itens.',
          duration: 3000,
        },
      },
    });
    return;
  }

  playerState.moedas -= itemDefinition.preco;
  playerState.itens.push(itemId);

  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({
      event: 'game_event',
      payload: {
        type: 'show_notification',
        payload: {
          title: 'Nova Aquisição!',
          message: `${playerState.nome} comprou um(a) ${itemDefinition.nome}!`,
          duration: 3500,
          isEvent: true,
        },
      },
    })
  );

  handleCloseShop(room, user);
}

// ===================================================================================
//  LÓGICA DE INTERAÇÕES ESPECIAIS
// ===================================================================================

function triggerShopInteraction(room: Room, shopNodeId: number) {
  const { turnInfo, lojas } = room.gameState!;
  turnInfo.fase_do_turno = 'em_loja';
  const shopState = lojas.find(s => s.nodeId === shopNodeId);

  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({
      event: 'gameStateUpdate',
      payload: { type: 'gameStateUpdate', payload: room.gameState! },
    })
  );
  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({
      event: 'game_event',
      payload: {
        type: 'show_shop_modal',
        payload: { nodeId: shopNodeId, items: shopState ? shopState.items : [] },
      },
    })
  );
  startActionTimer(room, () => {
    const user = room.players.get(turnInfo.id_jogador_da_vez)!;
    console.log(`[Timer Sala ${room.id}] Jogador demorou na loja. Fechando automaticamente.`);
    handleCloseShop(room, user);
  });
}

function handleCloseShop(room: Room, user: ConnectedUser) {
  const { gameState } = room;
  if (
    !gameState ||
    gameState.turnInfo.id_jogador_da_vez !== user.id ||
    gameState.turnInfo.fase_do_turno !== 'em_loja'
  )
    return;

  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({ event: 'game_event', payload: { type: 'hide_shop_modal' } })
  );

  const stepsRemaining = gameState.turnInfo.passosRestantesAposLoja || 0;
  gameState.turnInfo.passosRestantesAposLoja = 0;

  if (stepsRemaining > 0) {
    setTimeout(() => continueMovement(room, stepsRemaining, null), 500); // Dado nulo aqui
  } else {
    setTimeout(() => passTurn(room), 500);
  }
}

function handlePayToAvoidCatastrophe(room: Room, user: ConnectedUser) {
  const { gameState } = room;
  if (
    !gameState ||
    gameState.turnInfo.fase_do_turno !== 'escolha_catastrofe' ||
    gameState.turnInfo.id_jogador_da_vez !== user.id
  )
    return;

  const playerState = gameState.players.find(p => p.id === user.id)!;
  const cost = gameDefinitions.casas.roxa.efeito.custo_para_evitar;

  if (playerState.moedas < cost) {
    handleFaceTheCatastrophe(room, user);
    return;
  }

  playerState.moedas -= cost;
  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({
      event: 'game_event',
      payload: {
        type: 'show_notification',
        payload: {
          title: 'Ufa!',
          message: `${playerState.nome} pagou ${cost} moedas e escapou do perigo!`,
          duration: 4000,
          isEvent: true,
        },
      },
    })
  );
  closeCatastropheAndPassTurn(room);
}

function handleFaceTheCatastrophe(room: Room, user: ConnectedUser) {
  const { gameState } = room;
  if (
    !gameState ||
    gameState.turnInfo.fase_do_turno !== 'escolha_catastrofe' ||
    gameState.turnInfo.id_jogador_da_vez !== user.id
  )
    return;

  const playerState = gameState.players.find(p => p.id === user.id)!;
  const catastrofes = gameDefinitions.catastrofes;
  const sorteada = catastrofes[Math.floor(Math.random() * catastrofes.length)];

  let message = sorteada.descricao;
  switch (sorteada.id) {
    case 'perder_metade_moedas':
      const moedasPerdidas = Math.floor(playerState.moedas / 2);
      playerState.moedas -= moedasPerdidas;
      message = `Um buraco negro engoliu ${moedasPerdidas} das suas moedas!`;
      break;
    case 'perder_item':
      if (playerState.itens.length > 0) {
        const itemPerdidoIndex = Math.floor(Math.random() * playerState.itens.length);
        const itemPerdidoId = playerState.itens.splice(itemPerdidoIndex, 1)[0];
        const itemDef = (gameDefinitions.itens as any)[itemPerdidoId];
        message = `Um cometa destruiu seu item: ${itemDef.nome}!`;
      } else {
        message = 'Um cometa passou de raspão, mas você não tinha itens para perder!';
      }
      break;
    case 'voltar_ao_inicio':
      playerState.posicao_mapa_id = 0;
      message = 'Você foi puxado por um portal de volta para o início!';
      break;
  }

  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({
      event: 'game_event',
      payload: {
        type: 'show_notification',
        payload: {
          title: 'Catástrofe!',
          message: `${playerState.nome}: ${message}`,
          duration: 5000,
          isEvent: true,
        },
      },
    })
  );
  closeCatastropheAndPassTurn(room);
}

function closeCatastropheAndPassTurn(room: Room) {
  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({ event: 'game_event', payload: { type: 'hide_catastrophe_modal' } })
  );
  setTimeout(() => passTurn(room), 5500);
}

function triggerStarFragmentInteraction(room: Room) {
  const { turnInfo } = room.gameState!;
  turnInfo.fase_do_turno = 'decisao_fragmento';
  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({
      event: 'gameStateUpdate',
      payload: { type: 'gameStateUpdate', payload: room.gameState! },
    })
  );
  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({ event: 'game_event', payload: { type: 'show_star_fragment_modal' } })
  );
  startActionTimer(room, () => {
    const user = room.players.get(turnInfo.id_jogador_da_vez)!;
    console.log(`[Timer Sala ${room.id}] Jogador não decidiu sobre o fragmento. Ignorando.`);
    handleIgnoreStarFragment(room, user);
  });
}

function handleBuyStarFragment(room: Room, user: ConnectedUser) {
  const { gameState } = room;
  if (
    !gameState ||
    gameState.turnInfo.fase_do_turno !== 'decisao_fragmento' ||
    gameState.turnInfo.id_jogador_da_vez !== user.id
  )
    return;

  const playerState = gameState.players.find(p => p.id === user.id)!;
  const cost = 20;

  if (playerState.moedas < cost) {
    roomManager.sendToUser(user.id, {
      event: 'game_event',
      payload: {
        type: 'show_notification',
        payload: {
          title: 'Saldo Insuficiente',
          message: `Você precisa de ${cost} moedas para comprar o fragmento.`,
          duration: 3000,
        },
      },
    });
    handleIgnoreStarFragment(room, user);
    return;
  }

  playerState.moedas -= cost;
  playerState.fragmentos += 1;
  room.realocateStarFragment();
  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({
      event: 'game_event',
      payload: {
        type: 'show_notification',
        payload: {
          title: 'Fragmento Adquirido!',
          message: `${playerState.nome} conseguiu um Fragmento de Estrela!`,
          duration: 4000,
          isEvent: true,
        },
      },
    })
  );

  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({
      event: 'gameStateUpdate',
      payload: { type: 'gameStateUpdate', payload: room.gameState! },
    })
  );

  continueAfterFragmentDecision(room);
}

function handleIgnoreStarFragment(room: Room, user: ConnectedUser) {
  const { gameState } = room;
  if (
    !gameState ||
    gameState.turnInfo.fase_do_turno !== 'decisao_fragmento' ||
    gameState.turnInfo.id_jogador_da_vez !== user.id
  )
    return;
  continueAfterFragmentDecision(room);
}

function continueAfterFragmentDecision(room: Room) {
  const { gameState } = room;
  if (!gameState) return;

  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({ event: 'game_event', payload: { type: 'hide_star_fragment_modal' } })
  );

  const stepsRemaining = gameState.turnInfo.passosRestantesAposLoja || 0;
  gameState.turnInfo.passosRestantesAposLoja = 0;

  if (stepsRemaining > 0) {
    setTimeout(() => continueMovement(room, stepsRemaining, null), 500); // Dado nulo aqui
  } else {
    setTimeout(() => passTurn(room), 500);
  }
}
