// js/game-state.js

let gameState = {
  partida: {
    status: 'em_andamento',
    fase_do_turno: 'inicio_turno',
    turno_atual: 1,
    id_jogador_da_vez: 'p1',
    evento_global_ativo: null, // NOVO: Para rastrear eventos como "Era de Ouro"
  },
  jogadores: [
    { id: 'p1', nome: 'Cometa Vermelho', posicao_mapa_id: 0, moedas: 10, fragmentos: 0, itens: [] },
    { id: 'p2', nome: 'Estrela Azul', posicao_mapa_id: 0, moedas: 10, fragmentos: 0, itens: [] },
    { id: 'p3', nome: 'Nebulosa Verde', posicao_mapa_id: 0, moedas: 10, fragmentos: 0, itens: [] },
  ],
  mapa: {
    posicao_fragmento_estrela_id: 17,
  },
};

export default gameState;
