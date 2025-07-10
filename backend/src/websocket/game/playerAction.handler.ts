import { ConnectedUser } from '..';
import { roomManager } from '../managers/roomManager';
import { Room } from '../managers/Room';
import { findNodeById, gameDefinitions } from './gameData';

interface PlayerActionPayload {
  action: 'main_button_click' | 'choose_path';
  nodeId?: number;
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
  if (room.gameState.turnInfo.id_jogador_da_vez !== userId) {
    user.ws.send(JSON.stringify({ event: 'error', message: 'Não é a sua vez de jogar.' }));
    return;
  }

  // Roteia a ação para o handler correto
  switch (payload.action) {
    case 'main_button_click':
      handleMainButtonClick(room);
      break;
    case 'choose_path':
      handleChoosePath(room, user.id, payload.nodeId!);
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

  // Inicia o motor de movimento com o resultado do dado
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

  // Move o jogador um passo para fora da bifurcação
  currentPlayerState.posicao_mapa_id = chosenNodeId;

  // Continua o movimento a partir da nova posição com os passos restantes
  continueMovement(room, stepsRemainingAfterChoice);
}

/**
 * O motor de movimento principal. Calcula o caminho e envia um único evento de animação.
 * @param room - A sala de jogo.
 * @param stepsToTake - O número de casas a andar.
 * @param initialDiceRoll - [Opcional] O resultado original do dado para notificação.
 */
function continueMovement(room: Room, stepsToTake: number, initialDiceRoll: number | null = null) {
  const { turnInfo, players } = room.gameState!;
  const currentPlayer = players.find(p => p.id === turnInfo.id_jogador_da_vez)!;

  // Se não há passos a dar, o movimento já terminou onde o jogador está.
  if (stepsToTake <= 0) {
    processEndOfMovement(room, currentPlayer.posicao_mapa_id);
    return;
  }

  let currentNode = findNodeById(currentPlayer.posicao_mapa_id);
  const path = [currentNode!.id];
  let finalDestinationNode = currentNode!;
  let movementStopsAtBifurcation = false;

  // 1. CALCULAR O CAMINHO COMPLETO E O DESTINO FINAL
  for (let i = 0; i < stepsToTake; i++) {
    if (!finalDestinationNode || finalDestinationNode.conexoes.length === 0) break;

    const nextNodeId = finalDestinationNode.conexoes[0];
    finalDestinationNode = findNodeById(nextNodeId)!;
    path.push(finalDestinationNode.id);

    // Se encontrar uma bifurcação, o MOVIMENTO PARA AQUI.
    if (finalDestinationNode.tipo === 'bifurcacao') {
      movementStopsAtBifurcation = true;
      const stepsRemaining = stepsToTake - (i + 1);
      turnInfo.passosRestantes = stepsRemaining;
      turnInfo.opcoesBifurcacao = finalDestinationNode.conexoes;
      console.log(
        `[Sala ${room.id}] Movimento planejado para na bifurcação ${finalDestinationNode.id} com ${stepsRemaining} passos restantes.`
      );
      break; // Para o cálculo do caminho.
    }
  }

  // 2. ENVIAR UM ÚNICO EVENTO DE ANIMAÇÃO PARA O FRONTEND
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

  // 3. AGUARDAR A ANIMAÇÃO E PROCESSAR O RESULTADO
  const finalNodeInPath = findNodeById(path[path.length - 1])!;
  const animationDuration = path.length * 500 + 500;

  setTimeout(() => {
    // Atualiza a posição do jogador no estado do servidor para o final do caminho animado
    currentPlayer.posicao_mapa_id = finalNodeInPath.id;

    if (movementStopsAtBifurcation) {
      // Se parou na bifurcação, apenas atualiza o estado para aguardar a escolha
      turnInfo.fase_do_turno = 'escolha_bifurcacao';
      roomManager.broadcastToRoom(
        room.id,
        JSON.stringify({
          event: 'gameStateUpdate',
          payload: { type: 'gameStateUpdate', payload: room.gameState! },
        })
      );
    } else {
      // Se o movimento terminou, processa o efeito da casa
      processEndOfMovement(room, finalNodeInPath.id);
    }
  }, animationDuration);
}

/**
 * Processa os efeitos da casa onde o jogador aterrissou.
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
  let shouldPassTurn = true;

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
  if (shouldPassTurn) {
    setTimeout(() => {
      passTurn(room);
    }, 4500);
  }
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

  // Reseta o estado para o próximo turno
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
