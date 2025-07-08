// js/map-controller.js
import gameState from './game-state.js';
import gameData from './game-data.js';

const mapController = {
  // A função de clique agora será gerenciada externamente
  addGridClickListener: function (callback) {
    const gridCells = document.querySelectorAll('.grid-cell');
    gridCells.forEach(cell => {
      // Pega as coordenadas do dataset da célula
      const x = parseInt(cell.dataset.x, 10);
      const y = parseInt(cell.dataset.y, 10);
      // Adiciona o listener que chama o callback com as coordenadas
      cell.addEventListener('click', () => callback(x, y));
    });
  },

  pintarPonto: function (x, y, cor) {
    const cell = document.querySelector(`.grid-cell[data-x='${x}'][data-y='${y}']`);
    if (cell) cell.style.backgroundColor = cor;
  },

  pintarVariosPontos: function (pontos) {
    pontos.forEach(ponto => this.pintarPonto(ponto.x, ponto.y, ponto.cor));
  },

  construirTabuleiro: function () {
    const container = document.getElementById('unified-grid-container');
    if (!container) return;
    for (let row = 0; row < 41; row++) {
      for (let col = 0; col < 41; col++) {
        const cell = document.createElement('div');
        if (row < 40 && col < 40) {
          cell.classList.add('grid-cell');
          const xCoord = 40 - col;
          const yCoord = 40 - row;
          cell.dataset.x = xCoord;
          cell.dataset.y = yCoord;
        } else if (row === 40 && col < 40) {
          cell.classList.add('label', 'x-axis-label');
          cell.textContent = 40 - col;
        } else if (col === 40 && row < 40) {
          cell.classList.add('label', 'y-axis-label');
          cell.textContent = 40 - row;
        } else {
          cell.classList.add('label');
        }
        container.insertBefore(cell, container.querySelector('#peoes-container'));
      }
    }
  },

  criarPeoes: function () {
    const peoesContainer = document.getElementById('peoes-container');
    gameState.jogadores.forEach(player => {
      const peao = document.createElement('div');
      peao.id = `peao-${player.id}`;
      peao.className = 'peao';
      peoesContainer.appendChild(peao);
    });
  },

  atualizarPosicaoPeoes: function () {
    gameState.jogadores.forEach(player => {
      const pontoDoMapa = gameData.mapa.find(p => p.id === player.posicao_mapa_id);
      if (pontoDoMapa) {
        const celula = document.querySelector(
          `.grid-cell[data-x='${pontoDoMapa.x}'][data-y='${pontoDoMapa.y}']`
        );
        const peao = document.getElementById(`peao-${player.id}`);
        if (celula && peao) {
          const x = celula.offsetLeft + celula.offsetWidth / 2 - peao.offsetWidth / 2;
          const y = celula.offsetTop + celula.offsetHeight / 2 - peao.offsetHeight / 2;
          peao.style.transform = `translate(${x}px, ${y}px)`;
        }
      }
    });
  },

  destacarOpcoesBifurcacao: function (conexoesIds) {
    conexoesIds.forEach(id => {
      const pontoDoMapa = gameData.mapa.find(p => p.id === id);
      if (pontoDoMapa) {
        const celula = document.querySelector(
          `.grid-cell[data-x='${pontoDoMapa.x}'][data-y='${pontoDoMapa.y}']`
        );
        if (celula) celula.classList.add('ponto-bifurcacao-opcao');
      }
    });
  },

  limparDestaquesBifurcacao: function () {
    document.querySelectorAll('.ponto-bifurcacao-opcao').forEach(el => {
      el.classList.remove('ponto-bifurcacao-opcao');
    });
  },
};

export default mapController;
