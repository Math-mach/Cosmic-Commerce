interface MapNode {
  id: number;
  x: number;
  y: number;
  tipo: 'inicial' | 'caminho' | 'bifurcacao';
  conexoes: number[];
  tipoCasa?: string | null;
}

export const gameDefinitions = {
  casas: {
    azul: {
      nome: 'Casa Azul',
      efeito: { tipo: 'ganhar_moedas', valor_base: 3 },
    },
    vermelha: {
      nome: 'Casa Vermelha',
      efeito: { tipo: 'perder_moedas', valor_base: 3 },
    },
    verde: { nome: 'Casa de Evento' },
    amarela: {
      nome: 'Loja Cósmica',
      efeito: { tipo: 'loja' },
    },
  },
  eventos_casa_interrogacao: [
    {
      id: 'chuva_de_moedas',
      nome: 'Chuva de Moedas!',
      efeito_detalhado: 'Todos os jogadores ganham 5 moedas.',
    },
    {
      id: 'imposto_coletivo',
      nome: 'Imposto Coletivo!',
      efeito_detalhado: 'Todos os jogadores perdem 5 moedas.',
    },
    {
      id: 'roleta_da_sorte',
      nome: 'Roleta da Sorte!',
      efeito_detalhado: 'Você tem 50% de chance de ganhar 10 moedas.',
    },
  ],
  itens: {
    dado_adicional: {
      id: 'dado_adicional',
      nome: 'Dado Adicional',
      preco: 10,
      efeito_detalhado:
        'Quando usado, o jogador rola 2 dados de 6 lados (2D6) em vez de 1D6 em sua Fase de Rolagem.',
    },
    ladrao_de_moedas: {
      id: 'ladrao_de_moedas',
      nome: 'Ladrão de Moedas',
      preco: 8,
      efeito_detalhado:
        'O jogador escolhe um jogador alvo. O servidor subtrai 10 moedas do alvo (garantindo que o valor não fique negativo). O dinheiro não é transferido.',
    },
    item_de_teleporte: {
      id: 'item_de_teleporte',
      nome: 'Item de Teleporte',
      preco: 15,
      efeito_detalhado:
        'O servidor seleciona aleatoriamente UM OUTRO jogador. As posições do usuário e do alvo são trocadas no `gameState`.',
    },
  },
};

export const mapaBase: MapNode[] = [
  // Caminho Inicial
  { id: 0, x: 1, y: 5, tipo: 'inicial', conexoes: [1] },
  { id: 1, x: 3, y: 5, tipo: 'caminho', conexoes: [2] },
  { id: 2, x: 5, y: 3, tipo: 'caminho', conexoes: [3] },
  { id: 3, x: 7, y: 3, tipo: 'caminho', conexoes: [4] },
  { id: 4, x: 9, y: 3, tipo: 'caminho', conexoes: [5] },
  { id: 5, x: 11, y: 3, tipo: 'caminho', conexoes: [6] },
  { id: 6, x: 13, y: 3, tipo: 'caminho', conexoes: [7] },
  // 1ª Bifurcação
  { id: 7, x: 15, y: 3, tipo: 'bifurcacao', conexoes: [8, 14] },

  // Ramo A (da Bifurcação 7)
  { id: 8, x: 17, y: 3, tipo: 'caminho', conexoes: [9] },
  { id: 9, x: 19, y: 3, tipo: 'caminho', conexoes: [10] },
  { id: 10, x: 19, y: 5, tipo: 'caminho', conexoes: [11] },
  { id: 11, x: 19, y: 7, tipo: 'caminho', conexoes: [12] },
  // 2ª Bifurcação
  { id: 12, x: 19, y: 9, tipo: 'bifurcacao', conexoes: [13, 27] },
  { id: 13, x: 17, y: 9, tipo: 'caminho', conexoes: [37] },

  // Ramo B (da Bifurcação 7)
  { id: 14, x: 15, y: 5, tipo: 'caminho', conexoes: [15] },
  { id: 15, x: 13, y: 7, tipo: 'caminho', conexoes: [16] },
  { id: 16, x: 11, y: 8, tipo: 'caminho', conexoes: [17] },
  { id: 17, x: 9, y: 9, tipo: 'caminho', conexoes: [18] },
  { id: 18, x: 7, y: 9, tipo: 'caminho', conexoes: [19] },
  { id: 19, x: 5, y: 9, tipo: 'caminho', conexoes: [20] },
  { id: 20, x: 3, y: 9, tipo: 'caminho', conexoes: [21] },
  { id: 21, x: 3, y: 7, tipo: 'caminho', conexoes: [1] },

  // Ramo saindo da Bifurcação 12
  { id: 27, x: 21, y: 11, tipo: 'caminho', conexoes: [28] },
  { id: 28, x: 23, y: 11, tipo: 'caminho', conexoes: [29] },
  { id: 29, x: 25, y: 11, tipo: 'caminho', conexoes: [30] },
  { id: 30, x: 27, y: 11, tipo: 'caminho', conexoes: [31] },
  // 3ª Bifurcação
  { id: 31, x: 29, y: 11, tipo: 'bifurcacao', conexoes: [22, 58] },

  // Circuito que sai da Bifurcação 31
  { id: 22, x: 29, y: 9, tipo: 'caminho', conexoes: [23] },
  { id: 23, x: 29, y: 7, tipo: 'caminho', conexoes: [24] },
  { id: 24, x: 29, y: 5, tipo: 'caminho', conexoes: [25] },
  { id: 25, x: 27, y: 3, tipo: 'caminho', conexoes: [49] },

  // Caminho da parte de baixo
  { id: 49, x: 25, y: 1, tipo: 'caminho', conexoes: [50] },
  { id: 50, x: 23, y: 1, tipo: 'caminho', conexoes: [51] },
  { id: 51, x: 21, y: 1, tipo: 'caminho', conexoes: [9] },

  // Continuação do caminho principal
  { id: 37, x: 17, y: 11, tipo: 'caminho', conexoes: [38] },
  { id: 38, x: 17, y: 13, tipo: 'caminho', conexoes: [39] },
  { id: 39, x: 15, y: 15, tipo: 'caminho', conexoes: [40] },
  // 4ª Bifurcação
  { id: 40, x: 13, y: 15, tipo: 'bifurcacao', conexoes: [41, 118] },
  { id: 41, x: 11, y: 15, tipo: 'caminho', conexoes: [42] },
  { id: 42, x: 9, y: 16, tipo: 'caminho', conexoes: [43] },
  { id: 43, x: 7, y: 16, tipo: 'caminho', conexoes: [44] },
  { id: 44, x: 5, y: 17, tipo: 'caminho', conexoes: [45] },
  { id: 45, x: 3, y: 17, tipo: 'caminho', conexoes: [46] },
  { id: 46, x: 3, y: 15, tipo: 'caminho', conexoes: [47] },
  { id: 47, x: 3, y: 13, tipo: 'caminho', conexoes: [48] },
  { id: 48, x: 3, y: 11, tipo: 'caminho', conexoes: [20] },

  // Caminho do meio que sai da Bifurcação 40
  { id: 118, x: 13, y: 18, tipo: 'caminho', conexoes: [119] },
  { id: 119, x: 14, y: 21, tipo: 'caminho', conexoes: [120] },
  { id: 120, x: 15, y: 24, tipo: 'caminho', conexoes: [121] },
  { id: 121, x: 16, y: 27, tipo: 'caminho', conexoes: [122] },
  { id: 122, x: 17, y: 30, tipo: 'caminho', conexoes: [85] },

  // Caminho da direita (saindo da Bifurcação 31)
  { id: 58, x: 31, y: 13, tipo: 'caminho', conexoes: [59] },
  // 5ª Bifurcação
  { id: 59, x: 33, y: 15, tipo: 'bifurcacao', conexoes: [60, 61] },
  { id: 60, x: 35, y: 17, tipo: 'caminho', conexoes: [62] },
  { id: 61, x: 31, y: 17, tipo: 'caminho', conexoes: [73] },

  // Ramo superior direito (saindo de 60)
  { id: 62, x: 36, y: 19, tipo: 'caminho', conexoes: [63] },
  { id: 63, x: 38, y: 20, tipo: 'caminho', conexoes: [64] },
  { id: 64, x: 39, y: 22, tipo: 'caminho', conexoes: [65] },
  { id: 65, x: 40, y: 25, tipo: 'caminho', conexoes: [66] },
  { id: 66, x: 40, y: 27, tipo: 'caminho', conexoes: [67] },
  { id: 67, x: 38, y: 29, tipo: 'caminho', conexoes: [68] },
  { id: 68, x: 36, y: 30, tipo: 'caminho', conexoes: [69] },
  { id: 69, x: 34, y: 30, tipo: 'caminho', conexoes: [70] },
  { id: 70, x: 32, y: 31, tipo: 'caminho', conexoes: [71] },

  // Ramo inferior direito (saindo de 61)
  { id: 73, x: 30, y: 19, tipo: 'caminho', conexoes: [74] },
  { id: 74, x: 29, y: 21, tipo: 'caminho', conexoes: [75] },
  { id: 75, x: 27, y: 23, tipo: 'caminho', conexoes: [76] },
  { id: 76, x: 25, y: 23, tipo: 'caminho', conexoes: [77] },
  { id: 77, x: 23, y: 24, tipo: 'caminho', conexoes: [78] },
  { id: 78, x: 22, y: 26, tipo: 'caminho', conexoes: [79] },
  { id: 79, x: 24, y: 27, tipo: 'caminho', conexoes: [80] },
  { id: 80, x: 26, y: 28, tipo: 'caminho', conexoes: [81] },
  { id: 81, x: 28, y: 29, tipo: 'caminho', conexoes: [82] },
  { id: 82, x: 30, y: 30, tipo: 'caminho', conexoes: [70] },

  // 6ª Bifurcação Central
  { id: 71, x: 32, y: 33, tipo: 'bifurcacao', conexoes: [72, 94] },
  { id: 72, x: 29, y: 33, tipo: 'caminho', conexoes: [83] },
  { id: 94, x: 34, y: 34, tipo: 'caminho', conexoes: [95] },

  // Ramo esquerdo (saindo de 72)
  { id: 83, x: 26, y: 33, tipo: 'caminho', conexoes: [84] },
  { id: 84, x: 23, y: 33, tipo: 'caminho', conexoes: [85] },
  { id: 85, x: 20, y: 32, tipo: 'caminho', conexoes: [86] },
  { id: 86, x: 18, y: 34, tipo: 'caminho', conexoes: [87] },
  { id: 87, x: 16, y: 36, tipo: 'caminho', conexoes: [104] },

  // 7ª Bifurcação
  { id: 88, x: 12, y: 36, tipo: 'bifurcacao', conexoes: [89, 105] },

  // Ramo direito (saindo de 94)
  { id: 95, x: 34, y: 36, tipo: 'caminho', conexoes: [96] },
  { id: 96, x: 32, y: 37, tipo: 'caminho', conexoes: [97] },
  { id: 97, x: 30, y: 38, tipo: 'caminho', conexoes: [98] },
  { id: 98, x: 28, y: 38, tipo: 'caminho', conexoes: [99] },
  { id: 99, x: 26, y: 38, tipo: 'caminho', conexoes: [100] },
  { id: 100, x: 24, y: 38, tipo: 'caminho', conexoes: [101] },
  { id: 101, x: 22, y: 38, tipo: 'caminho', conexoes: [102] },
  { id: 102, x: 20, y: 37, tipo: 'caminho', conexoes: [103] },
  { id: 103, x: 18, y: 37, tipo: 'caminho', conexoes: [87] },
  { id: 104, x: 14, y: 36, tipo: 'caminho', conexoes: [88] },

  // Ramo superior da Bifurcação 88
  { id: 89, x: 10, y: 37, tipo: 'caminho', conexoes: [90] },
  { id: 90, x: 8, y: 39, tipo: 'caminho', conexoes: [91] },
  { id: 91, x: 6, y: 40, tipo: 'caminho', conexoes: [92] },
  { id: 92, x: 4, y: 39, tipo: 'caminho', conexoes: [93] },
  { id: 93, x: 3, y: 37, tipo: 'caminho', conexoes: [110] },

  // Ramo inferior da Bifurcação 88
  { id: 105, x: 10, y: 34, tipo: 'caminho', conexoes: [106] },
  { id: 106, x: 8, y: 32, tipo: 'caminho', conexoes: [107] },
  { id: 107, x: 8, y: 30, tipo: 'caminho', conexoes: [108] },
  { id: 108, x: 6, y: 29, tipo: 'caminho', conexoes: [109] },
  { id: 109, x: 3, y: 29, tipo: 'caminho', conexoes: [115] },

  // Circuito final de baixo
  { id: 110, x: 2, y: 35, tipo: 'caminho', conexoes: [111] },
  { id: 111, x: 1, y: 33, tipo: 'caminho', conexoes: [112] },
  { id: 112, x: 1, y: 31, tipo: 'caminho', conexoes: [109] },
  { id: 115, x: 3, y: 26, tipo: 'caminho', conexoes: [116] },
  { id: 116, x: 3, y: 23, tipo: 'caminho', conexoes: [117] },
  { id: 117, x: 3, y: 20, tipo: 'caminho', conexoes: [45] },
];

const pontosParaPintar = [
  { x: 1, y: 5, cor: 'blue' },
  { x: 3, y: 5, cor: 'blue' },
  { x: 5, y: 3, cor: 'blue' },
  { x: 7, y: 3, cor: 'green' },
  { x: 9, y: 3, cor: 'blue' },
  { x: 11, y: 3, cor: 'blue' },
  { x: 13, y: 3, cor: 'blue' },
  { x: 15, y: 3, cor: 'grey' },
  { x: 17, y: 3, cor: 'blue' },
  { x: 19, y: 3, cor: 'blue' },
  { x: 21, y: 1, cor: 'blue' },
  { x: 23, y: 1, cor: 'blue' },
  { x: 25, y: 1, cor: 'blue' },
  { x: 27, y: 3, cor: 'green' },
  { x: 29, y: 5, cor: 'red' },
  { x: 29, y: 7, cor: 'blue' },
  { x: 29, y: 9, cor: 'blue' },
  { x: 30, y: 9, cor: 'black' },
  { x: 29, y: 11, cor: 'grey' },
  { x: 27, y: 11, cor: 'purple' },
  { x: 25, y: 11, cor: 'blue' },
  { x: 23, y: 11, cor: 'blue' },
  { x: 21, y: 11, cor: 'blue' },
  { x: 19, y: 5, cor: 'yellow' },
  { x: 19, y: 7, cor: 'blue' },
  { x: 19, y: 9, cor: 'grey' },
  { x: 17, y: 9, cor: 'blue' },
  { x: 17, y: 11, cor: 'blue' },
  { x: 17, y: 13, cor: 'blue' },
  { x: 15, y: 15, cor: 'blue' },
  { x: 13, y: 15, cor: 'grey' },
  { x: 11, y: 15, cor: 'green' },
  { x: 9, y: 16, cor: 'red' },
  { x: 7, y: 16, cor: 'blue' },
  { x: 5, y: 17, cor: 'blue' },
  { x: 15, y: 5, cor: 'blue' },
  { x: 13, y: 7, cor: 'blue' },
  { x: 11, y: 8, cor: 'blue' },
  { x: 9, y: 9, cor: 'blue' },
  { x: 7, y: 9, cor: 'green' },
  { x: 5, y: 9, cor: 'blue' },
  { x: 3, y: 9, cor: 'blue' },
  { x: 3, y: 7, cor: 'red' },
  { x: 3, y: 11, cor: 'purple' },
  { x: 3, y: 13, cor: 'green' },
  { x: 3, y: 15, cor: 'blue' },
  { x: 3, y: 17, cor: 'green' },
  { x: 31, y: 13, cor: 'green' },
  { x: 33, y: 15, cor: 'grey' },
  { x: 35, y: 17, cor: 'blue' },
  { x: 36, y: 19, cor: 'blue' },
  { x: 38, y: 20, cor: 'blue' },
  { x: 39, y: 22, cor: 'blue' },
  { x: 40, y: 25, cor: 'green' },
  { x: 40, y: 27, cor: 'blue' },
  { x: 38, y: 29, cor: 'green' },
  { x: 36, y: 30, cor: 'green' },
  { x: 34, y: 30, cor: 'blue' },
  { x: 32, y: 31, cor: 'blue' },
  { x: 31, y: 17, cor: 'blue' },
  { x: 30, y: 19, cor: 'red' },
  { x: 29, y: 21, cor: 'blue' },
  { x: 27, y: 23, cor: 'blue' },
  { x: 25, y: 23, cor: 'red' },
  { x: 23, y: 24, cor: 'blue' },
  { x: 22, y: 26, cor: 'purple' },
  { x: 24, y: 27, cor: 'green' },
  { x: 26, y: 28, cor: 'blue' },
  { x: 28, y: 29, cor: 'red' },
  { x: 30, y: 30, cor: 'blue' },
  { x: 32, y: 33, cor: 'grey' },
  { x: 34, y: 34, cor: 'blue' },
  { x: 34, y: 36, cor: 'red' },
  { x: 32, y: 37, cor: 'blue' },
  { x: 30, y: 38, cor: 'blue' },
  { x: 28, y: 38, cor: 'yellow' },
  { x: 26, y: 38, cor: 'blue' },
  { x: 24, y: 38, cor: 'blue' },
  { x: 22, y: 38, cor: 'green' },
  { x: 20, y: 37, cor: 'green' },
  { x: 18, y: 37, cor: 'purple' },
  { x: 29, y: 33, cor: 'blue' },
  { x: 26, y: 33, cor: 'green' },
  { x: 23, y: 33, cor: 'red' },
  { x: 20, y: 32, cor: 'blue' },
  { x: 18, y: 34, cor: 'green' },
  { x: 16, y: 36, cor: 'blue' },
  { x: 14, y: 36, cor: 'green' },
  { x: 12, y: 36, cor: 'grey' },
  { x: 10, y: 37, cor: 'blue' },
  { x: 9, y: 37, cor: 'black' },
  { x: 8, y: 39, cor: 'blue' },
  { x: 6, y: 40, cor: 'green' },
  { x: 4, y: 39, cor: 'purple' },
  { x: 3, y: 37, cor: 'green' },
  { x: 2, y: 35, cor: 'blue' },
  { x: 1, y: 33, cor: 'blue' },
  { x: 1, y: 31, cor: 'green' },
  { x: 3, y: 29, cor: 'blue' },
  { x: 3, y: 26, cor: 'blue' },
  { x: 3, y: 23, cor: 'green' },
  { x: 3, y: 20, cor: 'blue' },
  { x: 6, y: 29, cor: 'green' },
  { x: 8, y: 30, cor: 'blue' },
  { x: 8, y: 32, cor: 'blue' },
  { x: 10, y: 34, cor: 'blue' },
  { x: 13, y: 18, cor: 'green' },
  { x: 14, y: 21, cor: 'red' },
  { x: 15, y: 24, cor: 'blue' },
  { x: 16, y: 27, cor: 'blue' },
  { x: 17, y: 30, cor: 'blue' },
];

function getTipoCasaPelaCor(cor: string): string | null {
  switch (cor) {
    case 'blue':
      return 'azul';
    case 'red':
      return 'vermelha';
    case 'green':
      return 'verde';
    case 'yellow':
      return 'amarela';
    case 'purple':
      return 'roxa';
    case 'grey':
      return 'cinza';
    default:
      return null;
  }
}

export const mapa: MapNode[] = mapaBase.map(ponto => {
  const pontoCor = pontosParaPintar.find(p => p.x === ponto.x && p.y === ponto.y);
  const tipoCasa = pontoCor ? getTipoCasaPelaCor(pontoCor.cor) : null;
  return { ...ponto, tipoCasa };
});

export function findNodeById(nodeId: number): MapNode | undefined {
  return mapa.find(node => node.id === nodeId);
}
