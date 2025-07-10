// js/main.js
import gameData from './game-data.js';
import gameManager from './game-manager.js';
import uiController from './ui-controller.js';
import mapController from './map-controller.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Constrói a parte visual do tabuleiro
  mapController.construirTabuleiro();
  mapController.pintarVariosPontos(gameData.pontosParaPintar);

  // 2. Cria e posiciona os elementos dos jogadores
  mapController.criarPeoes();
  mapController.atualizarPosicaoPeoes();

  // 3. Inicializa a interface do usuário
  uiController.inicializarUI();

  // 4. Conecta a lógica de clique ao tabuleiro
  // Isso é feito APÓS a construção do tabuleiro para garantir que as células existam.
  mapController.addGridClickListener((x, y) => {
    gameManager.jogadorClicouNaGrade(x, y);
  });

  // 5. Adiciona o listener ao botão de ação principal
  document.getElementById('action-button').addEventListener('click', () => {
    gameManager.jogadorClicouAcao();
  });

  // 6. Inicia o fluxo do jogo
  gameManager.iniciarJogo();
});
