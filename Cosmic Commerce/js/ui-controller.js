// js/ui-controller.js
import gameState from './game-state.js';

const FASES_UI = {
  inicio_turno: { titulo: 'Início do Turno', acoes: ['Aguarde... Efeitos automáticos.'] },
  uso_item_pre_rolagem: { titulo: 'Fase de Ação', acoes: ['Usar Item', 'Rolar o Dado'] },
  rolagem_dado: { titulo: 'Fase de Rolagem', acoes: ['Rolando o dado...'] },
  movimento: { titulo: 'Fase de Movimento', acoes: ['Movendo peão...'] },
  aterrissagem: { titulo: 'Fase de Aterrissagem', acoes: ['Resolvendo efeito da casa...'] },
  fim_turno: { titulo: 'Fim do Turno', acoes: ['Passando a vez...'] },
  escolha_bifurcacao: { titulo: 'Bifurcação!', acoes: ['Clique no caminho que deseja seguir.'] },
};

const uiController = {
  inicializarUI: function () {
    this.atualizarPainelJogadores();
  },

  atualizarPainelJogadores: function () {
    const playersPanel = document.getElementById('ui-players-panel');
    playersPanel.innerHTML = '';
    const jogadorAtualId = gameState.partida.id_jogador_da_vez;
    gameState.jogadores.forEach(player => {
      const card = document.createElement('div');
      card.className = 'player-card';
      card.id = `player-card-${player.id}`;
      if (player.id === jogadorAtualId) {
        card.classList.add('active-player');
      }
      card.innerHTML = `
                <h3>${player.nome}</h3>
                <div class="player-stats">
                    <span>Moedas:</span><span>${player.moedas}</span>
                    <span>Fragmentos:</span><span>${player.fragmentos}</span>
                </div>
            `;
      playersPanel.appendChild(card);
    });
  },

  atualizarInformacoesGerais: function () {
    const jogadorAtual = gameState.jogadores.find(
      p => p.id === gameState.partida.id_jogador_da_vez
    );
    const gameInfo = document.getElementById('game-info');
    gameInfo.textContent = `Turno: ${gameState.partida.turno_atual} - Vez de: ${jogadorAtual.nome}`;
  },

  desabilitarBotaoAcao: function () {
    const actionButton = document.getElementById('action-button');
    actionButton.textContent = 'Aguarde...';
    actionButton.disabled = true;
  },

  // NOVO: A função que estava faltando foi adicionada aqui
  mostrarPassosRestantes: function (passos) {
    const gameInfo = document.getElementById('game-info');
    gameInfo.textContent = `Movendo... Passos restantes: ${passos}`;
  },

  mostrarMensagemTemporaria: function (texto, duracaoMs) {
    const gameInfo = document.getElementById('game-info');
    const textoOriginal = gameInfo.textContent;
    gameInfo.textContent = texto;
    // Após a mensagem, restaura o texto de informação geral
    setTimeout(() => {
      if (gameInfo.textContent === texto) {
        this.atualizarInformacoesGerais();
      }
    }, duracaoMs);
  },

  atualizarFaseUI: function () {
    const faseAtual = gameState.partida.fase_do_turno;
    const uiData = FASES_UI[faseAtual] || { titulo: 'Fase Desconhecida', acoes: [] };
    document.getElementById('phase-title').textContent = uiData.titulo;
    const actionsList = document.getElementById('phase-actions');
    actionsList.innerHTML = '';
    uiData.acoes.forEach(acao => {
      const li = document.createElement('li');
      li.textContent = acao;
      actionsList.appendChild(li);
    });
    const actionButton = document.getElementById('action-button');
    if (faseAtual === 'uso_item_pre_rolagem') {
      actionButton.textContent = 'Rolar o Dado';
      actionButton.disabled = false;
    } else {
      this.desabilitarBotaoAcao();
    }
  },

  mostrarNotificacaoEvento: function (titulo, descricao, duracaoMs) {
    const notificacaoAntiga = document.querySelector('.event-notification');
    if (notificacaoAntiga) notificacaoAntiga.remove();
    const notificacao = document.createElement('div');
    notificacao.className = 'event-notification';
    notificacao.innerHTML = `<h4>${titulo}</h4><p>${descricao}</p>`;
    document.body.appendChild(notificacao);
    getComputedStyle(notificacao).opacity;
    notificacao.classList.add('visible');
    setTimeout(() => {
      notificacao.classList.remove('visible');
      setTimeout(() => notificacao.remove(), 500);
    }, duracaoMs);
  },

  atualizarTudo: function () {
    this.atualizarPainelJogadores();
    this.atualizarInformacoesGerais();
    this.atualizarFaseUI();
  },
};

export default uiController;
