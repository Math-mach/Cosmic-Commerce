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
    | 'face_the_catastrophe'
    | 'use_item'
    | 'buy_star_fragment'
    | 'ignore_star_fragment';
  nodeId?: number;
  itemId?: string;
  targetPlayerId?: string;
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
    'use_item',
    'buy_star_fragment',
    'ignore_star_fragment',
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
      user.ws.send(
        JSON.stringify({ event: 'error', message: `Ação desconhecida: ${payload.action}` })
      );
      break;
  }
}

function handleMainButtonClick(room: Room) {
  const { turnInfo, players } = room.gameState!;
  const currentPlayer = players.find(p => p.id === turnInfo.id_jogador_da_vez)!;

  if (turnInfo.fase_do_turno !== 'uso_item_pre_rolagem') return;

  turnInfo.fase_do_turno = 'rolagem_dado';

  const dadoAdicionalEffect = currentPlayer.efeitos_ativos.find(e => e.id === 'dado_adicional');
  const cogumeloEffect = currentPlayer.efeitos_ativos.find(e => e.id === 'cogumelo_venenoso');

  let dadoComum = 0;
  let dadoExtra = 0;

  if (cogumeloEffect) {
    dadoComum = Math.floor(Math.random() * 3) + 1;
    console.log(
      `[Sala ${room.id}] Jogador ${currentPlayer.nome} foi afetado por Cogumelo Venenoso! Dado comum: ${dadoComum}`
    );
    currentPlayer.efeitos_ativos = currentPlayer.efeitos_ativos.filter(
      e => e.id !== 'cogumelo_venenoso'
    );
  } else {
    dadoComum = Math.floor(Math.random() * 6) + 1;
  }

  if (dadoAdicionalEffect) {
    dadoExtra = Math.floor(Math.random() * 6) + 1;
    console.log(
      `[Sala ${room.id}] Jogador ${currentPlayer.nome} usou Dado Adicional! Dado extra: ${dadoExtra}`
    );
    currentPlayer.efeitos_ativos = currentPlayer.efeitos_ativos.filter(
      e => e.id !== 'dado_adicional'
    );
  }

  const diceRoll = dadoComum + dadoExtra;

  if (dadoExtra > 0) {
    console.log(
      `[Sala ${room.id}] Rolagem total de ${currentPlayer.nome}: ${dadoComum} + ${dadoExtra} = ${diceRoll}`
    );
  } else {
    console.log(`[Sala ${room.id}] Rolagem total de ${currentPlayer.nome}: ${diceRoll}`);
  }

  continueMovement(room, diceRoll, diceRoll);
}

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

  console.log(`[Sala ${room.id}] Jogador ${playerState.nome} usou o item: ${itemDefinition.nome}`);

  switch (itemId) {
    case 'dado_adicional':
      playerState.efeitos_ativos.push({ id: 'dado_adicional', turnos_restantes: 1 });
      notificationMessage = `${playerState.nome} se preparou para rolar um dado extra!`;
      break;
    case 'cogumelo_venenoso':
    case 'ladrao_de_moedas':
    case 'item_de_teleporte':
      const targetPlayer = gameState.players.find(p => p.id === targetPlayerId);
      if (!targetPlayer || targetPlayer.id === user.id) {
        user.ws.send(JSON.stringify({ event: 'error', message: 'Alvo inválido.' }));
        return;
      }
      console.log(`[Sala ${room.id}] O alvo do item é: ${targetPlayer.nome}`);
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
      }
      break;
  }

  playerState.itens.splice(itemIndex, 1);
  gameState.turnInfo.itemUsedThisTurn = true;
  gameState.turnInfo.itemUsedId = itemId; // <<< ADICIONADO: Registra o ID do item usado.

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

function handleChoosePath(room: Room, userId: string, chosenNodeId: number) {
  const { turnInfo, players } = room.gameState!;
  if (turnInfo.fase_do_turno !== 'escolha_bifurcacao') return;

  const currentPlayerState = players.find(p => p.id === userId)!;
  const bifurcationNode = findNodeById(currentPlayerState.posicao_mapa_id)!;

  if (!bifurcationNode.conexoes.includes(chosenNodeId)) {
    console.warn(`[Sala ${room.id}] Jogador ${userId} fez uma escolha de caminho inválida.`);
    return;
  }

  const stepsRemainingAfterChoice = turnInfo.passosRestantes!;
  turnInfo.opcoesBifurcacao = [];
  turnInfo.passosRestantes = 0;
  turnInfo.fase_do_turno = 'movimento';
  currentPlayerState.posicao_mapa_id = chosenNodeId;
  continueMovement(room, stepsRemainingAfterChoice, stepsRemainingAfterChoice);
}

function continueMovement(room: Room, stepsToTake: number, initialDiceRoll: number | null = null) {
  const { turnInfo, players, posicaoFragmentoEstrelaId } = room.gameState!;
  const currentPlayer = players.find(p => p.id === turnInfo.id_jogador_da_vez)!;

  if (stepsToTake <= 0) {
    processEndOfMovement(room, currentPlayer.posicao_mapa_id);
    return;
  }

  let currentNode = findNodeById(currentPlayer.posicao_mapa_id);
  const path: number[] = [currentNode!.id];
  let movementStopsAtBifurcation = false;
  let movementStopsAtShop = false;
  let movementStopsAtStar = false;

  for (let i = 0; i < stepsToTake; i++) {
    if (!currentNode || currentNode.conexoes.length === 0) break;

    const nextNodeId = currentNode.conexoes[0];
    const nextNode = findNodeById(nextNodeId)!;
    path.push(nextNode.id);
    currentNode = nextNode;

    if (nextNode.id === posicaoFragmentoEstrelaId) {
      movementStopsAtStar = true;
      const stepsRemaining = stepsToTake - (i + 1);
      turnInfo.passosRestantesAposLoja = stepsRemaining;
      console.log(
        `[Sala ${room.id}] Movimento interrompido no Fragmento de Estrela ${nextNode.id} com ${stepsRemaining} passos restantes.`
      );
      break;
    }

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
    } else {
      processEndOfMovement(room, finalNodeInPath.id);
    }
  }, animationDuration);
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
    JSON.stringify({
      event: 'game_event',
      payload: { type: 'show_star_fragment_modal' },
    })
  );
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
  console.log(`[Sala ${room.id}] Jogador ${user.name} comprou um Fragmento de Estrela!`);

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

  room.realocateStarFragment();
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
  console.log(`[Sala ${room.id}] Jogador ${user.name} ignorou o Fragmento de Estrela.`);
  continueAfterFragmentDecision(room);
}

function continueAfterFragmentDecision(room: Room) {
  const { gameState } = room;
  if (!gameState) return;

  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({
      event: 'game_event',
      payload: { type: 'hide_star_fragment_modal' },
    })
  );

  const stepsRemaining = gameState.turnInfo.passosRestantesAposLoja || 0;
  gameState.turnInfo.passosRestantesAposLoja = 0;

  if (stepsRemaining > 0) {
    console.log(`Continuando movimento com ${stepsRemaining} passos após decisão do fragmento.`);
    setTimeout(() => continueMovement(room, stepsRemaining, stepsRemaining), 500);
  } else {
    setTimeout(() => passTurn(room), 500);
  }
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
        payload: { nodeId: shopNodeId, items: shopState ? shopState.items : [] },
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
        // <<< MUDANÇA AQUI >>>
        case 'roleta_da_sorte':
          // A lógica de 50% foi removida. O jogador agora sempre ganha 10 moedas.
          currentPlayerState.moedas += 10;
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
  setTimeout(() => passTurn(room), 5500);
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
    setTimeout(() => continueMovement(room, stepsRemaining, stepsRemaining), 500);
  } else {
    setTimeout(() => passTurn(room), 500);
  }
}

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

  const nextPlayerIndex = currentPlayerIndex === -1 ? 0 : (currentPlayerIndex + 1) % players.length;
  const nextPlayer = players[nextPlayerIndex];

  turnInfo.id_jogador_da_vez = nextPlayer.id;
  turnInfo.fase_do_turno = 'uso_item_pre_rolagem';
  turnInfo.itemUsedThisTurn = false;
  turnInfo.itemUsedId = undefined; // <<< ADICIONADO: Limpa o ID do item usado para o próximo turno.
  turnInfo.passosRestantes = 0;
  turnInfo.opcoesBifurcacao = [];
  turnInfo.passosRestantesAposLoja = 0;

  if (nextPlayerIndex === 0) {
    turnInfo.turno_atual++;
  }

  console.log(`[Sala ${room.id}] Turno passado para ${nextPlayer.nome}.`);

  const updatePayload = {
    event: 'gameStateUpdate',
    payload: { type: 'gameStateUpdate', payload: room.gameState! },
  };
  roomManager.broadcastToRoom(room.id, JSON.stringify(updatePayload));
}
