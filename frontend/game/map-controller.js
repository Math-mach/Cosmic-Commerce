import gameState from './game-state.js';
import gameData from './game-data.js';

// Coordenadas das casas especiais para adicionar a imagem da seta
const casasComSeta = [
  { x: 15, y: 2 },
  { x: 2, y: 9 },
  { x: 21, y: 4 },
  { x: 2, y: 17 },
  { x: 2, y: 28 },
  { x: 33, y: 32 },
  { x: 18, y: 32 },
  { x: 15, y: 37 },
];

const mapController = {
  addGridClickListener: function (callback) {
    const gridCells = document.querySelectorAll('#game-view .grid-cell');
    gridCells.forEach(cell => {
      const x = parseInt(cell.dataset.x, 10);
      const y = parseInt(cell.dataset.y, 10);
      cell.addEventListener('click', () => callback(x, y));
    });
  },

  construirTabuleiro: function () {
    const container = document.getElementById('unified-grid-container');
    if (!container) return;
    container.innerHTML = '<div id="peoes-container"></div>';

    // Passo 1: Desenha a grade vazia e os eixos
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

    // Passo 2: Popula a grade com imagens, cores e bifurcações
    const { mapa, gameDefinitions, pontosParaPintar } = gameData;
    mapa.forEach(node => {
      const cell = document.querySelector(
        `#game-view .grid-cell[data-x='${node.x}'][data-y='${node.y}']`
      );
      if (cell) {
        cell.innerHTML = '';
        cell.style.backgroundColor = 'transparent';

        let imagePath = '';
        let tooltipText = '';

        const casaDef = gameDefinitions.casas[node.tipoCasa];
        if (casaDef) {
          tooltipText = casaDef.nome;
        }

        if (node.tipo === 'bifurcacao') {
          cell.title = 'Bifurcação';
          node.conexoes.forEach((conexaoId, index) => {
            const seta = document.createElement('img');
            seta.src = 'assets/imagens/seta.png';
            seta.className = `seta-bifurcacao seta-bifurcacao-${node.id}-${index + 1}`;
            cell.appendChild(seta);
          });
          const pontoCentral = document.createElement('span');
          pontoCentral.className = 'ponto-central';
          cell.appendChild(pontoCentral);
        } else if (node.id === 0) {
          imagePath = 'assets/imagens/start_map.png';
          tooltipText = 'Ponto de Partida';
          if (imagePath) {
            const img = document.createElement('img');
            img.src = imagePath;
            img.alt = tooltipText;
            cell.appendChild(img);
          }
        } else {
          const imageNodeTypes = ['azul', 'vermelha', 'verde', 'amarela', 'roxa'];
          if (imageNodeTypes.includes(node.tipoCasa)) {
            switch (node.tipoCasa) {
              case 'azul':
                imagePath = 'assets/imagens/casa_azul.png';
                break;
              case 'vermelha':
                imagePath = 'assets/imagens/casa_vermelha.png';
                break;
              case 'verde':
                imagePath = 'assets/imagens/casa_verde.png';
                break;
              case 'amarela':
                imagePath = 'assets/imagens/casa_loja.png';
                break;
              case 'roxa':
                imagePath = 'assets/imagens/casa_do_azar.png';
                break;
            }
            if (imagePath) {
              const img = document.createElement('img');
              img.src = imagePath;
              cell.appendChild(img);
            }
          }
        }
      }
    });

    casasComSeta.forEach(coord => {
      const cell = document.querySelector(
        `#game-view .grid-cell[data-x='${coord.x}'][data-y='${coord.y}']`
      );
      if (cell) {
        cell.innerHTML = '';
        const img = document.createElement('img');
        img.src = 'assets/imagens/direcao.png';
        // <<< MUDANÇA AQUI: Classe única baseada na coordenada >>>
        img.className = `casa-especial seta-especial-${coord.x}-${coord.y}`;
        cell.appendChild(img);
      }
    });
  },

  // ... (O resto do arquivo permanece igual)
  criarPeoes: function (jogadores) {
    const peoesContainer = document.getElementById('peoes-container');
    if (!peoesContainer) return;
    peoesContainer.innerHTML = '';
    jogadores.forEach((player, index) => {
      const peao = document.createElement('div');
      peao.id = `peao-${player.id}`;
      peao.className = `peao peao-p${index + 1}`;
      peoesContainer.appendChild(peao);
    });
  },

  removerPeao: function (playerId) {
    const peao = document.getElementById(`peao-${playerId}`);
    if (peao) {
      peao.remove();
    }
  },

  atualizarPosicaoPeoes: function () {
    gameState.jogadores.forEach(player => {
      const pontoDoMapa = gameData.mapa.find(p => p.id === player.posicao_mapa_id);
      if (pontoDoMapa) {
        const celula = document.querySelector(
          `#game-view .grid-cell[data-x='${pontoDoMapa.x}'][data-y='${pontoDoMapa.y}']`
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
          `#game-view .grid-cell[data-x='${pontoDoMapa.x}'][data-y='${pontoDoMapa.y}']`
        );
        if (celula) celula.classList.add('ponto-bifurcacao-opcao');
      }
    });
  },

  limparDestaquesBifurcacao: function () {
    document.querySelectorAll('#game-view .ponto-bifurcacao-opcao').forEach(el => {
      el.classList.remove('ponto-bifurcacao-opcao');
    });
  },

  atualizarDestaqueFragmento: function () {
    const oldStar = document.querySelector('.star-icon');
    if (oldStar) {
      oldStar.remove();
    }

    const starNodeId = gameState.posicaoFragmentoEstrelaId;
    if (starNodeId === null || starNodeId === undefined) return;

    const pontoDoMapa = gameData.mapa.find(p => p.id === starNodeId);
    if (pontoDoMapa) {
      const celulaNova = document.querySelector(
        `#game-view .grid-cell[data-x='${pontoDoMapa.x}'][data-y='${pontoDoMapa.y}']`
      );
      if (celulaNova) {
        const starIcon = document.createElement('span');
        starIcon.className = 'star-icon';
        starIcon.textContent = '⭐';
        celulaNova.appendChild(starIcon);
      }
    }
  },
};

export default mapController;
