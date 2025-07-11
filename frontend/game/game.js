import gameData from './game-data.js';
import gameState from './game-state.js';
import uiController from './ui-controller.js';
import mapController from './map-controller.js';

let socket = null;
let actionButtonListener = null;
let gridClickListener = null;
let voteButtonListener = null;
let isAnimating = false; // <<< CORREÇÃO: "Semáforo" para controlar a animação restaurado.

export function initGame(initialState, socketInstance, meuId) {
  console.log('Módulo do Jogo: Iniciando com o estado:', initialState);

  socket = socketInstance;
  gameState.meuId = meuId;
  gameState.jogadores = initialState.players;
  gameState.partida = initialState.turnInfo;
  gameState.lojas = initialState.lojas;
  gameState.posicaoFragmentoEstrelaId = initialState.posicaoFragmentoEstrelaId;

  mapController.construirTabuleiro();

  mapController.criarPeoes(gameState.jogadores);
  mapController.atualizarPosicaoPeoes();
  mapController.atualizarDestaqueFragmento();
  uiController.registerSendActionCallback(sendActionToServer);
  uiController.inicializarUI();

  uiController.atualizarTudo();
  uiController.updateDiceCount(0);

  addGameListeners();
}

export function handleServerUpdate(updateData) {
  console.log('Módulo do Jogo: Recebendo atualização do servidor:', updateData);

  const { type, payload } = updateData;

  switch (type) {
    case 'gameStateUpdate':
      const oldPhase = gameState.partida?.fase_do_turno;
      const newPhase = payload.turnInfo.fase_do_turno;

      gameState.jogadores = payload.players;
      gameState.partida = payload.turnInfo;
      if (payload.lojas) gameState.lojas = payload.lojas;
      if (payload.posicaoFragmentoEstrelaId !== undefined) {
        gameState.posicaoFragmentoEstrelaId = payload.posicaoFragmentoEstrelaId;
      }

      uiController.atualizarTudo();
      mapController.atualizarPosicaoPeoes();
      mapController.atualizarDestaqueFragmento();

      // <<< CORREÇÃO: Lógica do contador protegida pelo semáforo >>>
      // Só atualizamos o dado aqui se uma animação NÃO estiver em progresso.
      if (!isAnimating) {
        const movementPausePhases = [
          'escolha_bifurcacao',
          'em_loja',
          'escolha_catastrofe',
          'decisao_fragmento',
        ];
        if (!movementPausePhases.includes(newPhase)) {
          uiController.updateDiceCount(0);
        }
      }

      if (oldPhase === 'escolha_bifurcacao' && newPhase !== 'escolha_bifurcacao') {
        mapController.limparDestaquesBifurcacao();
      }

      const eMinhaVez = gameState.meuId === payload.turnInfo.id_jogador_da_vez;
      if (newPhase === 'escolha_bifurcacao' && payload.turnInfo.opcoesBifurcacao && eMinhaVez) {
        mapController.destacarOpcoesBifurcacao(payload.turnInfo.opcoesBifurcacao);
      }
      break;

    case 'player_is_moving':
      console.log(`Animando movimento para o jogador ${payload.playerId}`);
      isAnimating = true; // <<< CORREÇÃO: Ativa o semáforo. A animação tem prioridade.

      const diceResult = payload.diceResult || payload.path.length;

      const animateStep = stepIndex => {
        if (stepIndex >= payload.path.length) {
          // A animação deste segmento terminou. Apenas desativa o semáforo.
          // O contador manterá o último valor exibido até a próxima atualização de estado.
          isAnimating = false;
          return;
        }

        const stepsRemaining = diceResult - stepIndex;
        uiController.updateDiceCount(stepsRemaining);

        const nodeId = payload.path[stepIndex];
        const playerState = gameState.jogadores.find(p => p.id === payload.playerId);
        if (playerState) {
          playerState.posicao_mapa_id = nodeId;
          mapController.atualizarPosicaoPeoes();
        }

        setTimeout(() => {
          animateStep(stepIndex + 1);
        }, 700);
      };

      animateStep(0);
      break;

    case 'show_notification':
      console.log(`Exibindo notificação:`, payload);
      if (payload.isEvent && payload.title) {
        uiController.mostrarNotificacaoEvento(payload.title, payload.message, payload.duration);
      }
      break;

    case 'show_shop_modal':
      const eMeuTurnoNaLoja = gameState.meuId === gameState.partida.id_jogador_da_vez;
      if (eMeuTurnoNaLoja) {
        console.log('Abrindo a loja para o jogador atual:', payload);
        uiController.openShopModal(payload.items);
      }
      break;

    case 'hide_shop_modal':
      console.log('Servidor mandou fechar a loja.');
      uiController.closeShopModal();
      break;

    case 'show_catastrophe_modal':
      const eMeuTurnoNaCatastrofe = gameState.meuId === gameState.partida.id_jogador_da_vez;
      if (eMeuTurnoNaCatastrofe) {
        console.log('Abrindo modal de catástrofe:', payload);
        uiController.openCatastropheModal(payload.cost);
      }
      break;

    case 'hide_catastrophe_modal':
      console.log('Servidor mandou fechar o modal de catástrofe.');
      uiController.closeCatastropheModal();
      break;

    case 'show_star_fragment_modal':
      const eMeuTurnoFragmento = gameState.meuId === gameState.partida.id_jogador_da_vez;
      if (eMeuTurnoFragmento) {
        uiController.openStarFragmentModal();
      }
      break;

    case 'hide_star_fragment_modal':
      uiController.closeStarFragmentModal();
      break;

    case 'player_disconnected_ingame':
      uiController.showDisconnectionModal(payload);
      break;

    case 'player_reconnected':
      uiController.hideDisconnectionModal();
      uiController.mostrarNotificacaoEvento(
        'Jogador Reconectado!',
        `${payload.playerName} voltou ao jogo.`,
        3000
      );
      break;

    case 'player_removed_ingame':
    case 'player_removed_by_vote':
      uiController.hideDisconnectionModal();
      mapController.removerPeao(payload.playerId);
      gameState.jogadores = gameState.jogadores.filter(p => p.id !== payload.playerId);
      uiController.atualizarPainelJogadores();
      uiController.mostrarNotificacaoEvento(
        'Jogador Removido',
        `${payload.playerName} foi removido da partida.`,
        4000
      );
      break;

    case 'vote_update':
      uiController.updateVoteCount(payload.votes, payload.votedFor);
      break;
  }
}

export function cleanupGame() {
  console.log('Módulo do Jogo: Limpando recursos.');
  if (actionButtonListener) {
    document.getElementById('action-button')?.removeEventListener('click', actionButtonListener);
    actionButtonListener = null;
  }
  uiController.hideDisconnectionModal();
  document.getElementById('ui-players-panel').innerHTML = '';
  document.getElementById('unified-grid-container').innerHTML = '<div id="peoes-container"></div>';
}

function addGameListeners() {
  const actionButton = document.getElementById('action-button');
  actionButtonListener = () => {
    console.log('Botão de ação do jogo clicado.');
    sendActionToServer('player_action', { action: 'main_button_click' });
  };
  actionButton.addEventListener('click', actionButtonListener);

  const voteButton = document.getElementById('vote-to-expel-btn');
  if (voteButton) {
    voteButtonListener = () => {
      const playerIdToExpel = voteButton.dataset.playerId;
      if (playerIdToExpel) {
        console.log(`Votando para expulsar ${playerIdToExpel}`);
        sendActionToServer('vote_to_expel', { playerIdToExpel });
        voteButton.disabled = true;
      }
    };
    voteButton.addEventListener('click', voteButtonListener);
  }

  gridClickListener = (x, y) => {
    if (gameState.partida?.fase_do_turno === 'escolha_bifurcacao') {
      const pontoClicado = gameData.mapa.find(p => p.x === x && p.y === y);
      if (pontoClicado && gameState.partida.opcoesBifurcacao?.includes(pontoClicado.id)) {
        console.log(`Jogador escolheu o caminho: ID ${pontoClicado.id}`);
        mapController.limparDestaquesBifurcacao();
        sendActionToServer('player_action', { action: 'choose_path', nodeId: pontoClicado.id });
      }
    }
  };
  mapController.addGridClickListener(gridClickListener);
}

function sendActionToServer(type, payload) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error('Módulo do Jogo: Tentativa de enviar ação sem socket conectado.');
    return;
  }
  console.log(`Módulo do Jogo: Enviando ação para o servidor -> Tipo: ${type}, Payload:`, payload);
  socket.send(JSON.stringify({ type, payload }));
}
