import gameState from './game-state.js';
import gameData from './game-data.js';

// A variável foi removida do escopo do módulo.
// let disconnectionCountdownInterval = null; // <-- REMOVIDO

const uiController = {
  _sendActionCallback: null,
  disconnectionCountdownInterval: null, // <-- ADICIONADO AQUI como uma propriedade

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

  // ... (função atualizarPainelJogadores e outras permanecem iguais) ...
  atualizarPainelJogadores: function () {
    const playersPanelLeft = document.getElementById('ui-players-panel');
    const playersPanelRight = document.getElementById('ui-players-panel-right');

    if (!playersPanelLeft || !playersPanelRight) return;

    playersPanelLeft.innerHTML = '';
    playersPanelRight.innerHTML = '';

    const eMinhaVez = gameState.meuId === gameState.partida?.id_jogador_da_vez;
    const faseDeUso = gameState.partida?.fase_do_turno === 'uso_item_pre_rolagem';
    const itemJaUsado = gameState.partida?.itemUsedThisTurn;

    gameState.jogadores.forEach((player, index) => {
      const card = document.createElement('div');
      card.className = 'player-card';
      if (player.id === gameState.partida?.id_jogador_da_vez) {
        card.classList.add('active-player');
      }

      let itemsHtml = '<ul class="player-item-list">';
      if (player.itens && player.itens.length > 0) {
        player.itens.forEach(itemId => {
          const itemDef = gameData.gameDefinitions.itens[itemId];
          const itemName = itemDef ? itemDef.nome : 'Item Desconhecido';
          const podeUsar = player.id === gameState.meuId && eMinhaVez && faseDeUso && !itemJaUsado;
          const useButtonHtml = podeUsar
            ? `<button class="use-item-btn" data-item-id="${itemId}">Usar</button>`
            : '';
          itemsHtml += `<li><span>${itemName}</span> ${useButtonHtml}</li>`;
        });
      } else {
        itemsHtml += `<li class="no-items">Nenhum item</li>`;
      }
      itemsHtml += '</ul>';

      let effectsHtml = '';
      if (player.efeitos_ativos && player.efeitos_ativos.length > 0) {
        player.efeitos_ativos.forEach(effect => {
          const effectDef = gameData.gameDefinitions.itens[effect.id];
          const effectName = effectDef ? effectDef.nome : 'Efeito Desconhecido';
          const turnsText = `(${effect.turnos_restantes} turno${effect.turnos_restantes > 1 ? 's' : ''
            })`;
          effectsHtml += `<li>${effectName} ${turnsText}</li>`;
        });
      } else {
        effectsHtml = `<li class="no-effects">Nenhum efeito ativo.</li>`;
      }

      const playerImageSrc = `assets/imagens/player_${index + 1}.png`;

      card.innerHTML = `
        <h3><img src="${playerImageSrc}" alt="Ícone do Jogador"> ${player.nome}</h3>
        <div class="player-stats">
            <span>Moedas:</span><span>${player.moedas}</span>
            <span>Fragmentos:</span><span>${player.fragmentos}</span>
        </div>
        
        <div class="player-effects">
            <h4>Efeitos Ativos</h4>
            <ul class="player-effect-list">
                ${effectsHtml}
            </ul>
        </div>

        <div class="player-inventory">
            <h4>Itens (${player.itens.length}/4)</h4>
            ${itemsHtml}
        </div>`;

      if (index < 2) {
        playersPanelLeft.appendChild(card);
      } else {
        playersPanelRight.appendChild(card);
      }
    });

    document.querySelectorAll('.use-item-btn').forEach(button => {
      button.addEventListener('click', e => {
        const itemId = e.target.dataset.itemId;
        this.handleItemUseClick(itemId);
      });
    });
  },

  updateTurnStatusPanel: function () {
    const turnCounter = document.getElementById('turn-counter');
    const currentPlayerTurn = document.getElementById('current-player-turn');
    const turnEffectsList = document.getElementById('turn-effects-list');

    if (!turnCounter || !currentPlayerTurn || !turnEffectsList) return;

    const { partida, jogadores } = gameState;
    if (!partida || !jogadores) return;

    const jogadorAtual = jogadores.find(p => p.id === partida.id_jogador_da_vez);

    turnCounter.textContent = partida.turno_atual || '1';
    currentPlayerTurn.textContent = `Vez de: ${jogadorAtual ? jogadorAtual.nome : '...'}`;

    const itemUsadoId = partida.itemUsedId;
    if (itemUsadoId) {
      const itemDef = gameData.gameDefinitions.itens[itemUsadoId];
      const itemName = itemDef ? itemDef.nome : 'Item Desconhecido';
      turnEffectsList.innerHTML = `<li>${itemName}</li>`;
    } else {
      turnEffectsList.innerHTML = `<li class="no-effects">Nenhum</li>`;
    }
  },

  updateDiceCount: function (count) {
    const diceCountEl = document.getElementById('dice-count');
    if (diceCountEl) {
      diceCountEl.textContent = count;
    }
  },

  handleItemUseClick: function (itemId) {
    const targetedItems = [
      'cogumelo_venenoso',
      'ladrao_de_moedas',
      'item_de_teleporte',
      'teia_cosmica',
    ];
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

  atualizarFaseUI: function () {
    const actionButton = document.getElementById('action-button');
    if (!actionButton) return;

    const faseAtual = gameState.partida?.fase_do_turno;
    const eMinhaVez = gameState.meuId === gameState.partida?.id_jogador_da_vez;

    if (eMinhaVez && faseAtual === 'uso_item_pre_rolagem') {
      actionButton.textContent = 'Rolar o Dado';
      actionButton.disabled = false;
      actionButton.classList.remove('disabled_button');
    } else {
      actionButton.textContent = 'Aguarde...';
      actionButton.disabled = true;
      actionButton.classList.add('disabled_button');
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

    if (this.disconnectionCountdownInterval) {
      clearInterval(this.disconnectionCountdownInterval);
    }

    let timeLeft = 60;
    const updateTimer = () => {
      const minutes = Math.floor(timeLeft / 60)
        .toString()
        .padStart(2, '0');
      const seconds = (timeLeft % 60).toString().padStart(2, '0');
      timerDisplay.textContent = `${minutes}:${seconds}`;
      timeLeft--;
      if (timeLeft < 0) {
        clearInterval(this.disconnectionCountdownInterval);
        this.disconnectionCountdownInterval = null;
      }
    };
    updateTimer();
    // Acessa a variável como uma propriedade do objeto
    this.disconnectionCountdownInterval = setInterval(updateTimer, 1000);
    modal.style.display = 'flex';
  },

  hideDisconnectionModal: function () {
    const modal = document.getElementById('disconnection-modal');
    if (modal) modal.style.display = 'none';

    // Acessa a variável como uma propriedade do objeto
    if (this.disconnectionCountdownInterval) {
      clearInterval(this.disconnectionCountdownInterval);
      this.disconnectionCountdownInterval = null;
    }
  },

  updateVoteCount: function (votes, playerId) {
    const voteStatus = document.getElementById('disconnection-vote-status');
    const connectedPlayersCount = gameState.jogadores.filter(p => p.id !== playerId).length;
    const majority = Math.floor(connectedPlayersCount / 2) + 1;
    if (voteStatus) voteStatus.textContent = `Votos para expulsar: ${votes} / ${majority}`;
  },

  showGameOverModal: function (payload) {
    const { finalScores, awards } = payload;
    const modal = document.getElementById('game-over-modal');
    const scoresList = document.getElementById('final-scores-list');
    const awardsList = document.getElementById('awards-list');

    if (!modal || !scoresList || !awardsList) return;

    scoresList.innerHTML = '';
    finalScores.forEach((player, index) => {
      const rank = index + 1;
      const li = document.createElement('li');
      li.innerHTML = `
            <span class="rank">${rank}º</span>
            <span class="name">${player.nome}</span>
            <span class="score">${player.finalScore} ⭐</span>
        `;
      scoresList.appendChild(li);
    });

    awardsList.innerHTML = `
        <div class="award-item">
            <span class="title">💰 Milionário (+1 ⭐):</span>
            <span class="winners">${awards.mostCoins.winners.join(', ')} (${awards.mostCoins.value
      })</span>
        </div>
        <div class="award-item">
            <span class="title">🏃 Explorador (+1 ⭐):</span>
            <span class="winners">${awards.mostMoved.winners.join(', ')} (${awards.mostMoved.value
      })</span>
        </div>
        <div class="award-item">
            <span class="title">🎲 Aventureiro (+1 ⭐):</span>
            <span class="winners">${awards.mostEvents.winners.join(', ')} (${awards.mostEvents.value
      })</span>
        </div>
    `;



    modal.style.display = 'flex';
  },

  hideGameOverModal: function () {
    const modal = document.getElementById('game-over-modal');
    if (modal) modal.style.display = 'none';
  },

  atualizarTudo: function () {
    this.atualizarPainelJogadores();
    this.updateTurnStatusPanel();
    this.atualizarFaseUI();
  },
};

export default uiController;