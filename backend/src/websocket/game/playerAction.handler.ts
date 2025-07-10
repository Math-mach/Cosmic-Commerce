import { ConnectedUser } from '..';
import { roomManager } from '../managers/roomManager';
import { Room } from '../managers/Room';
import { findNodeById, gameDefinitions } from './gameData';

interface PlayerActionPayload {
  action: 'main_button_click' | 'choose_path' | 'buy_item' | 'close_shop';
  nodeId?: number;
  itemId?: string;
  [key: string]: any;
}

/**
 * Ponto de entrada para todas as ações do jogador durante o jogo.
 */
export function handlePlayerAction(user: ConnectedUser, payload: PlayerActionPayload) {
  const { roomId, id: userId } = user;
  const room = roomManager.findRoomById(roomId || '');

  // Validações iniciais
  if (!room || room.state !== 'in_progress' || !room.gameState) {
    user.ws.send(JSON.stringify({ event: 'error', message: 'O jogo não está ativo.' }));
    return;
  }

  // Apenas o jogador da vez pode fazer a maioria das ações
  if (payload.action !== 'close_shop' && payload.action !== 'buy_item') {
    if (room.gameState.turnInfo.id_jogador_da_vez !== userId) {
      user.ws.send(JSON.stringify({ event: 'error', message: 'Não é a sua vez de jogar.' }));
      return;
    }
  }

  // Roteia a ação para o handler correto
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
    default:
      user.ws.send(JSON.stringify({ event: 'error', message: 'Ação desconhecida.' }));
      break;
  }
}

/**
 * Lida com o clique no botão principal, geralmente para rolar o dado.
 */
function handleMainButtonClick(room: Room) {
  const { turnInfo } = room.gameState!;
  if (turnInfo.fase_do_turno !== 'uso_item_pre_rolagem') {
    console.warn(`[Sala ${room.id}] Ação inválida na fase: ${turnInfo.fase_do_turno}`);
    return;
  }

  turnInfo.fase_do_turno = 'rolagem_dado';
  const diceRoll = Math.floor(Math.random() * 6) + 1;
  console.log(`[Sala ${room.id}] Jogador ${turnInfo.id_jogador_da_vez} rolou ${diceRoll}`);

  continueMovement(room, diceRoll, diceRoll);
}

/**
 * Lida com a escolha do jogador em uma bifurcação.
 */
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

  continueMovement(room, stepsRemainingAfterChoice);
}

/**
 * O motor de movimento principal. Agora inspeciona cada passo.
 * @param room - A sala de jogo.
 * @param stepsToTake - O número de casas a andar.
 * @param initialDiceRoll - [Opcional] O resultado original do dado para notificação.
 */
function continueMovement(room: Room, stepsToTake: number, initialDiceRoll: number | null = null) {
  const { turnInfo, players } = room.gameState!;
  const currentPlayer = players.find(p => p.id === turnInfo.id_jogador_da_vez)!;

  if (stepsToTake <= 0) {
    processEndOfMovement(room, currentPlayer.posicao_mapa_id);
    return;
  }

  let currentNode = findNodeById(currentPlayer.posicao_mapa_id);
  const path = [currentNode!.id];
  let movementStopsAtBifurcation = false;
  let movementStopsAtShop = false; // <<< NOVA VARIÁVEL DE CONTROLE

  // <<< MUDANÇA PRINCIPAL: O loop agora verifica cada passo em busca de lojas.
  for (let i = 0; i < stepsToTake; i++) {
    if (!currentNode || currentNode.conexoes.length === 0) break;

    const nextNodeId = currentNode.conexoes[0];
    const nextNode = findNodeById(nextNodeId)!;

    path.push(nextNode.id);
    currentNode = nextNode; // Atualiza o nó atual para o próximo passo

    // Verifica se a casa que acabamos de adicionar ao caminho é uma loja
    if (nextNode.tipoCasa === 'amarela') {
      movementStopsAtShop = true;
      console.log(`[Sala ${room.id}] Movimento interrompido na loja ${nextNode.id}.`);
      break; // Interrompe o loop, o movimento termina aqui.
    }

    if (nextNode.tipo === 'bifurcacao') {
      movementStopsAtBifurcation = true;
      const stepsRemaining = stepsToTake - (i + 1);
      turnInfo.passosRestantes = stepsRemaining;
      turnInfo.opcoesBifurcacao = nextNode.conexoes;
      break;
    }
  }

  // Envia o caminho (que pode ter sido encurtado pela loja) para o frontend animar
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

  // Após a animação, o backend atualiza o estado e decide o que fazer
  setTimeout(() => {
    currentPlayer.posicao_mapa_id = finalNodeInPath.id;

    if (movementStopsAtShop) {
      // Se parou na loja, aciona o evento da loja
      triggerShopInteraction(room, finalNodeInPath.id);
    } else if (movementStopsAtBifurcation) {
      // Se parou na bifurcação, espera a escolha do jogador
      turnInfo.fase_do_turno = 'escolha_bifurcacao';
      roomManager.broadcastToRoom(
        room.id,
        JSON.stringify({
          event: 'gameStateUpdate',
          payload: { type: 'gameStateUpdate', payload: room.gameState! },
        })
      );
    } else {
      // Se o movimento terminou normalmente, processa o efeito da casa final
      processEndOfMovement(room, finalNodeInPath.id);
    }
  }, animationDuration);
}

/**
 * <<< NOVA FUNÇÃO >>>
 * Isola a lógica de abrir a interface da loja.
 */
function triggerShopInteraction(room: Room, shopNodeId: number) {
  const { turnInfo, lojas } = room.gameState!;
  const currentPlayerId = turnInfo.id_jogador_da_vez;

  turnInfo.fase_do_turno = 'em_loja';
  const shopState = lojas.find(s => s.nodeId === shopNodeId);

  console.log(`[Sala ${room.id}] Jogador ${currentPlayerId} entrou na loja ${shopNodeId}`);

  // Envia o estado atualizado (com a fase 'em_loja')
  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({
      event: 'gameStateUpdate',
      payload: { type: 'gameStateUpdate', payload: room.gameState! },
    })
  );

  // Envia o comando para o frontend mostrar o modal
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

/**
 * Processa os efeitos da casa onde o jogador aterrissou.
 * Esta função agora só é chamada se o movimento não for interrompido por uma loja.
 */
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
    }
  }

  // Atualiza o estado para todos os jogadores
  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({
      event: 'gameStateUpdate',
      payload: { type: 'gameStateUpdate', payload: room.gameState! },
    })
  );

  // Mostra a notificação do efeito da casa, se houver
  if (notificationPayload) {
    roomManager.broadcastToRoom(
      room.id,
      JSON.stringify({
        event: 'game_event',
        payload: { type: 'show_notification', payload: { ...notificationPayload, duration: 4000 } },
      })
    );
  }

  // Passa o turno após a animação/notificação
  setTimeout(() => {
    passTurn(room);
  }, 4500);
}

/**
 * Lida com a tentativa de compra de um item.
 */
function handleBuyItem(room: Room, user: ConnectedUser, itemId: string) {
  const { gameState } = room;
  if (!gameState || gameState.turnInfo.fase_do_turno !== 'em_loja') return;
  if (gameState.turnInfo.id_jogador_da_vez !== user.id) return;

  const playerState = gameState.players.find(p => p.id === user.id);
  const itemDefinition = (gameDefinitions.itens as any)[itemId];

  if (!playerState || !itemDefinition) {
    user.ws.send(JSON.stringify({ event: 'error', message: 'Item ou jogador inválido.' }));
    return;
  }

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

  roomManager.sendToUser(user.id, {
    event: 'game_event',
    payload: {
      type: 'show_notification',
      payload: {
        title: 'Compra Efetuada!',
        message: `Você adquiriu: ${itemDefinition.nome}!`,
        duration: 3000,
      },
    },
  });

  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({
      event: 'gameStateUpdate',
      payload: { type: 'gameStateUpdate', payload: room.gameState! },
    })
  );
}

/**
 * Lida com o fechamento da loja, passando o turno.
 */
function handleCloseShop(room: Room, user: ConnectedUser) {
  const { gameState } = room;
  if (!gameState || gameState.turnInfo.fase_do_turno !== 'em_loja') return;
  if (gameState.turnInfo.id_jogador_da_vez !== user.id) return;

  console.log(`[Sala ${room.id}] Jogador ${user.name} saiu da loja. Passando o turno.`);

  roomManager.broadcastToRoom(
    room.id,
    JSON.stringify({
      event: 'game_event',
      payload: { type: 'hide_shop_modal' },
    })
  );

  setTimeout(() => {
    passTurn(room);
  }, 500);
}

/**
 * Avança para o próximo jogador.
 */
function passTurn(room: Room) {
  const players = room.getPlayers();
  const { turnInfo } = room.gameState!;
  const currentPlayerId = turnInfo.id_jogador_da_vez;
  const currentPlayerIndex = players.findIndex(p => p.id === currentPlayerId);

  if (currentPlayerIndex === -1) return;

  const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
  const nextPlayer = players[nextPlayerIndex];

  turnInfo.id_jogador_da_vez = nextPlayer.id;
  turnInfo.fase_do_turno = 'uso_item_pre_rolagem';
  turnInfo.passosRestantes = 0;
  turnInfo.opcoesBifurcacao = [];

  if (nextPlayerIndex === 0) {
    turnInfo.turno_atual++;
  }

  console.log(`[Sala ${room.id}] Turno passado para ${nextPlayer.name}.`);

  const updatePayload = {
    event: 'gameStateUpdate',
    payload: { type: 'gameStateUpdate', payload: room.gameState! },
  };
  roomManager.broadcastToRoom(room.id, JSON.stringify(updatePayload));
}
