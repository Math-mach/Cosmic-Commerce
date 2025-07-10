import gameState from './game-state.js';
import gameData from './game-data.js';

const FASES_UI = {
  inicio_turno: {
    titulo: 'Início do Turno',
    acoes: ['Aguarde... Efeitos automáticos.'],
  },
  uso_item_pre_rolagem: {
    titulo: 'Fase de Ação',
    acoes: ['Usar Item', 'Rolar o Dado'],
  },
  rolagem_dado: { titulo: 'Fase de Rolagem', acoes: ['Rolando o dado...'] },
  movimento: { titulo: 'Fase de Movimento', acoes: ['Movendo peão...'] },
  aterrissagem: {
    titulo: 'Fase de Aterrissagem',
    acoes: ['Resolvendo efeito da casa...'],
  },
  fim_turno: { titulo: 'Fim do Turno', acoes: ['Passando a vez...'] },
  escolha_bifurcacao: {
    titulo: 'Bifurcação!',
    acoes: ['Clique no caminho que deseja seguir.'],
  },
  em_loja: {
    titulo: 'Loja Cósmica',
    acoes: ['Compre um item ou clique em sair para continuar.'],
  },
};

const uiController = {
  _sendActionCallback: null,

  registerSendActionCallback(callback) {
    this._sendActionCallback = callback;
  },

  inicializarUI: function () {
    this.atualizarPainelJogadores();

    const closeShopBtn = document.getElementById('close-shop-btn');
    if (closeShopBtn) {
      closeShopBtn.addEventListener('click', () => {
        if (this._sendActionCallback) {
          this._sendActionCallback('player_action', { action: 'close_shop' });
        }
      });
    }
  },

  atualizarPainelJogadores: function () {
    const playersPanel = document.getElementById('ui-players-panel');
    if (!playersPanel) return;
    playersPanel.innerHTML = '';

    const jogadorAtualId = gameState.partida?.id_jogador_da_vez;
    const jogadores = gameState.jogadores || [];

    jogadores.forEach(player => {
      const card = document.createElement('div');
      card.className = 'player-card';
      card.id = `player-card-${player.id}`;
      if (player.id === jogadorAtualId) {
        card.classList.add('active-player');
      }

      // <<< MUDANÇA PRINCIPAL: GERAR LISTA DE ITENS EM HTML >>>
      let itemsHtml = '<ul class="player-item-list">';
      if (player.itens.length > 0) {
        player.itens.forEach(itemId => {
          const itemDef = gameData.gameDefinitions.itens[itemId];
          const itemName = itemDef ? itemDef.nome : 'Item Desconhecido';
          itemsHtml += `<li>${itemName}</li>`;
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
                </div>
            `;
      playersPanel.appendChild(card);
    });
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

      uiData = {
        titulo: `Vez de ${nomeJogador}`,
        acoes: ['Aguardando ação...'],
      };
    } else {
      uiData = FASES_UI[faseAtual] || {
        titulo: 'Aguardando Servidor',
        acoes: [],
      };
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
                </button>
            `;
      container.appendChild(itemElement);
    });

    container.querySelectorAll('.buy-item-btn').forEach(button => {
      button.addEventListener('click', e => {
        const id = e.currentTarget.dataset.itemId;
        if (this._sendActionCallback) {
          this._sendActionCallback('player_action', { action: 'buy_item', itemId: id });
        }
      });
    });

    modal.style.display = 'flex';
  },

  closeShopModal: function () {
    const modal = document.getElementById('shop-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  },

  atualizarTudo: function () {
    this.atualizarPainelJogadores();
    this.atualizarInformacoesGerais();
    this.atualizarFaseUI();
  },
};

export default uiController;
