import gameState from './game-state.js';
import gameData from './game-data.js';

const FASES_UI = {
  inicio_turno: { titulo: 'Início do Turno', acoes: ['Aguarde... Efeitos automáticos.'] },
  uso_item_pre_rolagem: { titulo: 'Fase de Ação', acoes: ['Usar Item', 'Rolar o Dado'] },
  rolagem_dado: { titulo: 'Fase de Rolagem', acoes: ['Rolando o dado...'] },
  movimento: { titulo: 'Fase de Movimento', acoes: ['Movendo peão...'] },
  aterrissagem: { titulo: 'Fase de Aterrissagem', acoes: ['Resolvendo efeito da casa...'] },
  fim_turno: { titulo: 'Fim do Turno', acoes: ['Passando a vez...'] },
  escolha_bifurcacao: { titulo: 'Bifurcação!', acoes: ['Clique no caminho que deseja seguir.'] },
  em_loja: { titulo: 'Loja Cósmica', acoes: ['Compre um item ou clique em sair para continuar.'] },
  escolha_catastrofe: {
    titulo: 'Decisão Perigosa',
    acoes: ['Pagar para evitar ou encarar o destino?'],
  },
  decisao_fragmento: {
    titulo: 'Fragmento à Vista!',
    acoes: ['Decida se quer comprar o fragmento.'],
  },
};

let disconnectionCountdownInterval = null;

const uiController = {
  _sendActionCallback: null,

  registerSendActionCallback(callback) {
    this._sendActionCallback = callback;
  },

  inicializarUI: function () {
    this.atualizarPainelJogadores();
    document.getElementById('close-shop-btn')?.addEventListener('click', () => {
      if (this._sendActionCallback)
        this._sendActionCallback('player_action', { action: 'close_shop' });
    });
    document.getElementById('pay-to-avoid-btn')?.addEventListener('click', () => {
      if (this._sendActionCallback)
        this._sendActionCallback('player_action', { action: 'pay_to_avoid_catastrophe' });
    });
    document.getElementById('face-catastrophe-btn')?.addEventListener('click', () => {
      if (this._sendActionCallback)
        this._sendActionCallback('player_action', { action: 'face_the_catastrophe' });
    });
    document
      .getElementById('cancel-target-btn')
      ?.addEventListener('click', () => this.closeTargetSelectionModal());
    document.getElementById('buy-star-btn')?.addEventListener('click', () => {
      if (this._sendActionCallback)
        this._sendActionCallback('player_action', { action: 'buy_star_fragment' });
    });
    document.getElementById('ignore-star-btn')?.addEventListener('click', () => {
      if (this._sendActionCallback)
        this._sendActionCallback('player_action', { action: 'ignore_star_fragment' });
    });
  },

  atualizarPainelJogadores: function () {
    const playersPanel = document.getElementById('ui-players-panel');
    if (!playersPanel) return;
    playersPanel.innerHTML = '';
    const eMinhaVez = gameState.meuId === gameState.partida?.id_jogador_da_vez;
    const faseDeUso = gameState.partida?.fase_do_turno === 'uso_item_pre_rolagem';
    const itemJaUsado = gameState.partida?.itemUsedThisTurn;

    gameState.jogadores.forEach(player => {
      const card = document.createElement('div');
      card.className = 'player-card';
      if (player.id === gameState.partida?.id_jogador_da_vez) {
        card.classList.add('active-player');
      }

      let itemsHtml = '<ul class="player-item-list">';
      if (player.itens.length > 0) {
        player.itens.forEach(itemId => {
          const itemDef = gameData.gameDefinitions.itens[itemId];
          const itemName = itemDef ? itemDef.nome : 'Item Desconhecido';
          const podeUsar = player.id === gameState.meuId && eMinhaVez && faseDeUso && !itemJaUsado;
          const useButtonHtml = podeUsar
            ? `<button class="use-item-btn" data-item-id="${itemId}">Usar</button>`
            : '';
          itemsHtml += `<li>${itemName} ${useButtonHtml}</li>`;
        });
      } else {
        itemsHtml += `<li class="no-items">Nenhum item</li>`;
      }
      itemsHtml += '</ul>';

      card.innerHTML = `
        <h3>${player.nome}</h3>
        <div class="player-stats">
            <span>Moedas:</span><span>${player.moedas}</span>
            <span>Fragmentos:</span><span>${player.fragmentos}</span>
        </div>
        <div class="player-inventory">
            <h4>Itens (${player.itens.length}/4)</h4>
            ${itemsHtml}
        </div>`;
      playersPanel.appendChild(card);
    });

    document.querySelectorAll('.use-item-btn').forEach(button => {
      button.addEventListener('click', e => {
        const itemId = e.target.dataset.itemId;
        this.handleItemUseClick(itemId);
      });
    });
  },

  handleItemUseClick: function (itemId) {
    const targetedItems = ['cogumelo_venenoso', 'ladrao_de_moedas', 'item_de_teleporte'];
    if (targetedItems.includes(itemId)) {
      this.openTargetSelectionModal(itemId);
    } else {
      if (this._sendActionCallback)
        this._sendActionCallback('player_action', { action: 'use_item', itemId: itemId });
    }
  },

  openTargetSelectionModal: function (itemId) {
    const modal = document.getElementById('target-selection-modal');
    const container = document.getElementById('target-players-container');
    if (!modal || !container) return;

    container.innerHTML = '';
    gameState.jogadores.forEach(player => {
      if (player.id === gameState.meuId) return;
      const playerBtn = document.createElement('button');
      playerBtn.textContent = player.nome;
      playerBtn.addEventListener('click', () => {
        if (this._sendActionCallback)
          this._sendActionCallback('player_action', {
            action: 'use_item',
            itemId: itemId,
            targetPlayerId: player.id,
          });
        this.closeTargetSelectionModal();
      });
      container.appendChild(playerBtn);
    });
    modal.style.display = 'flex';
  },

  closeTargetSelectionModal: function () {
    const modal = document.getElementById('target-selection-modal');
    if (modal) modal.style.display = 'none';
  },

  atualizarInformacoesGerais: function () {
    const gameInfo = document.getElementById('game-info');
    if (!gameInfo || !gameState.partida?.id_jogador_da_vez) return;
    const jogadorAtual = gameState.jogadores.find(
      p => p.id === gameState.partida.id_jogador_da_vez
    );
    if (!jogadorAtual) return;
    gameInfo.textContent = `Turno: ${gameState.partida.turno_atual} - Vez de: ${jogadorAtual.nome}`;
  },

  mostrarMensagemTemporaria: function (texto, duracaoMs) {
    const gameInfo = document.getElementById('game-info');
    if (!gameInfo) return;
    const textoOriginal = gameInfo.textContent;
    gameInfo.textContent = texto;
    setTimeout(() => {
      if (gameInfo.textContent === texto) {
        this.atualizarInformacoesGerais();
      }
    }, duracaoMs);
  },

  atualizarFaseUI: function () {
    const faseAtual = gameState.partida?.fase_do_turno;
    if (!faseAtual) return;
    const jogadorDaVezId = gameState.partida?.id_jogador_da_vez;
    const eMinhaVez = gameState.meuId === jogadorDaVezId;
    let uiData;

    if (!eMinhaVez) {
      const jogadorAtual = gameState.jogadores.find(p => p.id === jogadorDaVezId);
      const nomeJogador = jogadorAtual ? jogadorAtual.nome : 'outro jogador';
      uiData = { titulo: `Vez de ${nomeJogador}`, acoes: ['Aguardando ação...'] };
    } else {
      uiData = FASES_UI[faseAtual] || { titulo: 'Aguardando Servidor', acoes: [] };
    }

    const phaseTitle = document.getElementById('phase-title');
    if (phaseTitle) phaseTitle.textContent = uiData.titulo;
    const actionsList = document.getElementById('phase-actions');
    if (actionsList) {
      actionsList.innerHTML = '';
      uiData.acoes.forEach(acao => {
        const li = document.createElement('li');
        li.textContent = acao;
        actionsList.appendChild(li);
      });
    }
    const actionButton = document.getElementById('action-button');
    if (actionButton) {
      if (eMinhaVez && faseAtual === 'uso_item_pre_rolagem') {
        actionButton.textContent = 'Rolar o Dado';
        actionButton.disabled = false;
        actionButton.classList.remove('disabled_button');
      } else {
        actionButton.textContent = 'Aguarde...';
        actionButton.disabled = true;
        actionButton.classList.add('disabled_button');
      }
    }
  },

  mostrarNotificacaoEvento: function (titulo, descricao, duracaoMs) {
    const notificacaoAntiga = document.querySelector('#game-view .event-notification');
    if (notificacaoAntiga) notificacaoAntiga.remove();
    const notificacao = document.createElement('div');
    notificacao.className = 'event-notification';
    notificacao.innerHTML = `<h4>${titulo}</h4><p>${descricao}</p>`;
    document.getElementById('game-view')?.appendChild(notificacao);
    getComputedStyle(notificacao).opacity;
    notificacao.classList.add('visible');
    setTimeout(() => {
      notificacao.classList.remove('visible');
      setTimeout(() => notificacao.remove(), 500);
    }, duracaoMs);
  },

  openShopModal: function (itemIds) {
    const modal = document.getElementById('shop-modal');
    const container = document.getElementById('shop-items-container');
    if (!modal || !container) return;
    container.innerHTML = '';
    const allItems = gameData.gameDefinitions.itens;
    itemIds.forEach(itemId => {
      const item = allItems[itemId];
      if (!item) return;
      const itemElement = document.createElement('div');
      itemElement.className = 'shop-item';
      itemElement.innerHTML = `
        <div class="shop-item-info">
            <strong>${item.nome}</strong>
            <p>${item.efeito_detalhado}</p>
        </div>
        <button class="buy-item-btn" data-item-id="${item.id}">
            Comprar (${item.preco} 🪙)
        </button>`;
      container.appendChild(itemElement);
    });
    container.querySelectorAll('.buy-item-btn').forEach(button => {
      button.addEventListener('click', e => {
        const id = e.currentTarget.dataset.itemId;
        if (this._sendActionCallback)
          this._sendActionCallback('player_action', { action: 'buy_item', itemId: id });
      });
    });
    modal.style.display = 'flex';
  },

  closeShopModal: function () {
    const modal = document.getElementById('shop-modal');
    if (modal) modal.style.display = 'none';
  },

  openCatastropheModal: function (cost) {
    const modal = document.getElementById('catastrophe-modal');
    const payBtn = document.getElementById('pay-to-avoid-btn');
    if (modal && payBtn) {
      payBtn.textContent = `Pagar ${cost} 🪙 para evitar`;
      modal.style.display = 'flex';
    }
  },

  closeCatastropheModal: function () {
    const modal = document.getElementById('catastrophe-modal');
    if (modal) modal.style.display = 'none';
  },

  openStarFragmentModal: function () {
    const modal = document.getElementById('star-fragment-modal');
    if (modal) modal.style.display = 'flex';
  },

  closeStarFragmentModal: function () {
    const modal = document.getElementById('star-fragment-modal');
    if (modal) modal.style.display = 'none';
  },

  showDisconnectionModal: function ({ playerName, playerId }) {
    const modal = document.getElementById('disconnection-modal');
    const message = document.getElementById('disconnection-message');
    const timerDisplay = document.getElementById('disconnection-timer');
    const voteButton = document.getElementById('vote-to-expel-btn');
    const voteStatus = document.getElementById('disconnection-vote-status');

    if (!modal || !message || !timerDisplay || !voteButton || !voteStatus) return;

    message.textContent = `${playerName} desconectou-se. Aguardando retorno por 1 minuto...`;
    voteButton.dataset.playerId = playerId;
    voteButton.disabled = false;

    const connectedPlayersCount = gameState.jogadores.filter(p => p.id !== playerId).length;
    const majority = Math.floor(connectedPlayersCount / 2) + 1;
    voteStatus.textContent = `Votos para expulsar: 0 / ${majority}`;

    let timeLeft = 60;
    const updateTimer = () => {
      const minutes = Math.floor(timeLeft / 60)
        .toString()
        .padStart(2, '0');
      const seconds = (timeLeft % 60).toString().padStart(2, '0');
      timerDisplay.textContent = `${minutes}:${seconds}`;
      timeLeft--;
      if (timeLeft < 0) clearInterval(disconnectionCountdownInterval);
    };
    updateTimer();
    disconnectionCountdownInterval = setInterval(updateTimer, 1000);
    modal.style.display = 'flex';
  },

  hideDisconnectionModal: function () {
    const modal = document.getElementById('disconnection-modal');
    if (modal) modal.style.display = 'none';
    if (disconnectionCountdownInterval) {
      clearInterval(disconnectionCountdownInterval);
      disconnectionCountdownInterval = null;
    }
  },

  updateVoteCount: function (votes, playerId) {
    const voteStatus = document.getElementById('disconnection-vote-status');
    const connectedPlayersCount = gameState.jogadores.filter(p => p.id !== playerId).length;
    const majority = Math.floor(connectedPlayersCount / 2) + 1;
    if (voteStatus) voteStatus.textContent = `Votos para expulsar: ${votes} / ${majority}`;
  },

  atualizarTudo: function () {
    this.atualizarPainelJogadores();
    this.atualizarInformacoesGerais();
    this.atualizarFaseUI();
  },
};

export default uiController;
