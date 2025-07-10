import { ConnectedUser } from '..';
import { roomManager } from '../managers/roomManager';
import { Room } from '../managers/Room';
import { findNodeById, gameDefinitions } from './gameData';

interface PlayerActionPayload {
  action:
    | 'main_button_click'
    | 'choose_path'
    | 'buy_item'
    | 'close_shop'
    | 'pay_to_avoid_catastrophe'
    | 'face_the_catastrophe';
  nodeId?: number;
  itemId?: string;
  [key: string]: any;
}

export function handlePlayerAction(user: ConnectedUser, payload: PlayerActionPayload) {
  const { roomId, id: userId } = user;
  const room = roomManager.findRoomById(roomId || '');

  if (!room || room.state !== 'in_progress' || !room.gameState) {
    user.ws.send(JSON.stringify({ event: 'error', message: 'O jogo não está ativo.' }));
    return;
  }

  const nonTurnActions = [
    'close_shop',
    'buy_item',
    'pay_to_avoid_catastrophe',
    'face_the_catastrophe',
  ];
  if (!nonTurnActions.includes(payload.action)) {
    if (room.gameState.turnInfo.id_jogador_da_vez !== userId) {
      user.ws.send(JSON.stringify({ event: 'error', message: 'Não é a sua vez de jogar.' }));
      return;
    }
  }

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
    default:
      user.ws.send(JSON.stringify({ event: 'error', message: 'Ação desconhecida.' }));
      break;
  }
}

function handleMainButtonClick(room: Room) {
  const { turnInfo } = room.gameState!;
  if (turnInfo.fase_do_turno !== 'uso_item_pre_rolagem') return;

  turnInfo.fase_do_turno = 'rolagem_dado';
  const diceRoll = Math.floor(Math.random() * 6) + 1;
  console.log(`[Sala ${room.id}] Jogador ${turnInfo.id_jogador_da_vez} rolou ${diceRoll}`);

  continueMovement(room, diceRoll, diceRoll);
}

function handleChoosePath(room: Room, userId: string, chosenNodeId: number) {
  const { turnInfo, players } = room.gameState!;
  if (turnInfo.fase_do_turno !== 'escolha_bifurcacao') return;

  const currentPlayerState = players.find(p => p.id === userId)!;
  const bifurcationNode = findNodeById(currentPlayerState.posicao_mapa_id)!;

  if (!bifurcationNode.conexoes.includes(chosenNodeId)) return;

  const stepsRemainingAfterChoice = turnInfo.passosRestantes!;
  turnInfo.opcoesBifurcacao = [];
  turnInfo.passosRestantes = 0;
  turnInfo.fase_do_turno = 'movimento';

  currentPlayerState.posicao_mapa_id = chosenNodeId;
  continueMovement(room, stepsRemainingAfterChoice);
}

function continueMovement(room: Room, stepsToTake: number, initialDiceRoll: number | null = null) {
  const { turnInfo, players } = room.gameState!;
  const currentPlayer = players.find(p => p.id === turnInfo.id_jogador_da_vez)!;

  if (stepsToTake <= 0) {
    processEndOfMovement(room, currentPlayer.posicao_mapa_id);
    return;
  }

  let currentNode = findNodeById(currentPlayer.posicao_mapa_id);
  const path: number[] = [currentNode!.id];
  let movementStopsAtBifurcation = false;
  let movementStopsAtShop = false;

  for (let i = 0; i < stepsToTake; i++) {
    if (!currentNode || currentNode.conexoes.length === 0) break;

    const nextNodeId = currentNode.conexoes[0];
    const nextNode = findNodeById(nextNodeId)!;

    path.push(nextNode.id);
    currentNode = nextNode;

    if (nextNode.tipoCasa === 'amarela') {
      movementStopsAtShop = true;
      const stepsRemaining = stepsToTake - (i + 1);
      turnInfo.passosRestantesAposLoja = stepsRemaining;
      console.log(
        `[Sala ${room.id}] Movimento interrompido na loja ${nextNode.id} com ${stepsRemaining} passos restantes.`
      );
      break;
    }

    if (nextNode.tipo === 'bifurcacao') {
      movementStopsAtBifurcation = true;
      const stepsRemaining = stepsToTake - (i + 1);
      turnInfo.passosRestantes = stepsRemaining;
      turnInfo.opcoesBifurcacao = nextNode.conexoes;
      break;
    }
  }

  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({
      event: 'game_event',
      payload: {
        type: 'player_is_moving',
        payload: { playerId: currentPlayer.id, path, diceResult: initialDiceRoll },
      },
    })
  );

  const finalNodeInPath = findNodeById(path[path.length - 1])!;
  const animationDuration = path.length * 500 + (initialDiceRoll ? 500 : 0);

  setTimeout(() => {
    currentPlayer.posicao_mapa_id = finalNodeInPath.id;

    if (movementStopsAtShop) {
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
    } else {
      processEndOfMovement(room, finalNodeInPath.id);
    }
  }, animationDuration);
}

function triggerShopInteraction(room: Room, shopNodeId: number) {
  const { turnInfo, lojas } = room.gameState!;

  turnInfo.fase_do_turno = 'em_loja';
  const shopState = lojas.find(s => s.nodeId === shopNodeId);

  console.log(
    `[Sala ${room.id}] Jogador ${turnInfo.id_jogador_da_vez} entrou na loja ${shopNodeId}`
  );

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
        payload: {
          nodeId: shopNodeId,
          items: shopState ? shopState.items : [],
        },
      },
    })
  );
}

function processEndOfMovement(room: Room, finalNodeId: number) {
  const { turnInfo, players: playerStates } = room.gameState!;
  const currentPlayerState = playerStates.find(p => p.id === turnInfo.id_jogador_da_vez)!;

  console.log(
    `[Sala ${room.id}] Movimento terminado. Processando aterrissagem no nó ${finalNodeId}.`
  );

  currentPlayerState.posicao_mapa_id = finalNodeId;
  turnInfo.fase_do_turno = 'aterrissagem';

  const finalNode = findNodeById(currentPlayerState.posicao_mapa_id);
  let notificationPayload = null;

  if (finalNode && finalNode.tipoCasa) {
    const tipoCasa = finalNode.tipoCasa;
    if (tipoCasa === 'azul' || tipoCasa === 'vermelha') {
      const definicaoCasa = gameDefinitions.casas[tipoCasa];
      const efeito = definicaoCasa.efeito;
      if (efeito.tipo === 'ganhar_moedas') {
        currentPlayerState.moedas += efeito.valor_base;
        notificationPayload = {
          title: 'Casa Azul!',
          message: `Você ganhou ${efeito.valor_base} moedas!`,
        };
      } else if (efeito.tipo === 'perder_moedas') {
        const moedasPerdidas = Math.min(currentPlayerState.moedas, efeito.valor_base);
        currentPlayerState.moedas -= moedasPerdidas;
        notificationPayload = {
          title: 'Casa Vermelha!',
          message: `Você perdeu ${moedasPerdidas} moedas!`,
        };
      }
    } else if (tipoCasa === 'verde') {
      const eventos = gameDefinitions.eventos_casa_interrogacao;
      const eventoSorteado = eventos[Math.floor(Math.random() * eventos.length)];
      console.log(`[Sala ${room.id}] Evento sorteado: ${eventoSorteado.nome}`);
      switch (eventoSorteado.id) {
        case 'chuva_de_moedas':
          playerStates.forEach(p => (p.moedas += 5));
          break;
        case 'imposto_coletivo':
          playerStates.forEach(p => (p.moedas = Math.max(0, p.moedas - 5)));
          break;
        case 'roleta_da_sorte':
          if (Math.random() < 0.5) {
            currentPlayerState.moedas += 10;
          }
          break;
      }
      notificationPayload = {
        title: eventoSorteado.nome,
        message: eventoSorteado.efeito_detalhado,
        isEvent: true,
      };
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

      return;
    }
  }

  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({
      event: 'gameStateUpdate',
      payload: { type: 'gameStateUpdate', payload: room.gameState! },
    })
  );

  if (notificationPayload) {
    roomManager.broadcastToRoom(
      room.id,
      JSON.stringify({
        event: 'game_event',
        payload: { type: 'show_notification', payload: { ...notificationPayload, duration: 4000 } },
      })
    );
  }

  setTimeout(() => {
    passTurn(room);
  }, 4500);
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
  console.log(`[Sala ${room.id}] Jogador ${user.name} pagou ${cost} para evitar a catástrofe.`);

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

  console.log(`[Sala ${room.id}] Jogador ${user.name} enfrenta a catástrofe: ${sorteada.id}`);

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
    JSON.stringify({
      event: 'game_event',
      payload: { type: 'hide_catastrophe_modal' },
    })
  );

  setTimeout(() => {
    passTurn(room);
  }, 5500);
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
  console.log(`[Sala ${room.id}] Jogador ${user.name} comprou ${itemDefinition.nome}`);

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

function handleCloseShop(room: Room, user: ConnectedUser) {
  const { gameState } = room;
  if (!gameState || gameState.turnInfo.id_jogador_da_vez !== user.id) return;
  if (gameState.turnInfo.fase_do_turno !== 'em_loja') return;

  console.log(`[Sala ${room.id}] Jogador ${user.name} saiu da loja.`);

  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({
      event: 'game_event',
      payload: { type: 'hide_shop_modal' },
    })
  );

  const stepsRemaining = gameState.turnInfo.passosRestantesAposLoja || 0;
  gameState.turnInfo.passosRestantesAposLoja = 0;

  if (stepsRemaining > 0) {
    console.log(`Continuando movimento com ${stepsRemaining} passos.`);
    setTimeout(() => {
      continueMovement(room, stepsRemaining);
    }, 500);
  } else {
    setTimeout(() => {
      passTurn(room);
    }, 500);
  }
}

function passTurn(room: Room) {
  const players = room.getPlayers();
  const { turnInfo } = room.gameState!;
  const currentPlayerId = turnInfo.id_jogador_da_vez;
  const currentPlayerIndex = players.findIndex(p => p.id === currentPlayerId);

  if (currentPlayerIndex === -1) return;
  if (turnInfo.fase_do_turno === 'uso_item_pre_rolagem') return;

  const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
  const nextPlayer = players[nextPlayerIndex];

  turnInfo.id_jogador_da_vez = nextPlayer.id;
  turnInfo.fase_do_turno = 'uso_item_pre_rolagem';
  turnInfo.passosRestantes = 0;
  turnInfo.opcoesBifurcacao = [];
  turnInfo.passosRestantesAposLoja = 0;

  if (nextPlayerIndex === 0) {
    turnInfo.turno_atual++;
  }

  console.log(`[Sala ${room.id}] Turno passado para ${nextPlayer.name}.`);

  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({
      event: 'gameStateUpdate',
      payload: { type: 'gameStateUpdate', payload: room.gameState! },
    })
  );
}
