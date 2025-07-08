// js/game-manager.js
import gameState from './game-state.js';
import gameData from './game-data.js';
import uiController from './ui-controller.js';
import mapController from './map-controller.js';

const gameManager = {
  iniciarJogo: function () {
    console.log('Jogo iniciado!');
    this.processarFaseAtual();
  },
  processarFaseAtual: function () {
    uiController.atualizarTudo();
    const fase = gameState.partida.fase_do_turno;
    if (fase !== 'uso_item_pre_rolagem' && fase !== 'escolha_bifurcacao') {
      uiController.desabilitarBotaoAcao();
      setTimeout(() => {
        if (fase === 'rolagem_dado') {
          this.executarRolagemDado();
        } else if (fase === 'aterrissagem') {
          this.aplicarEfeitoDaCasa();
        } else {
          this.avancarParaProximaFase();
        }
      }, 1000);
    }
  },
  avancarParaProximaFase: function (proximaFaseOverride = null) {
    let proximaFase;
    if (proximaFaseOverride) {
      proximaFase = proximaFaseOverride;
    } else {
      const sequenciaFases = [
        'inicio_turno',
        'uso_item_pre_rolagem',
        'rolagem_dado',
        'movimento',
        'aterrissagem',
        'fim_turno',
      ];
      const indiceFaseAtual = sequenciaFases.indexOf(gameState.partida.fase_do_turno);
      if (indiceFaseAtual === sequenciaFases.length - 1) {
        this.avancarTurno();
        return;
      }
      proximaFase = sequenciaFases[indiceFaseAtual + 1];
    }
    gameState.partida.fase_do_turno = proximaFase;
    this.processarFaseAtual();
  },
  avancarTurno: function () {
    const jogadoresIds = gameState.jogadores.map(p => p.id);
    const indiceAtual = jogadoresIds.indexOf(gameState.partida.id_jogador_da_vez);
    const proximoIndice = (indiceAtual + 1) % jogadoresIds.length;
    if (proximoIndice === 0) {
      gameState.partida.turno_atual++;
    }
    gameState.partida.id_jogador_da_vez = jogadoresIds[proximoIndice];
    gameState.partida.fase_do_turno = 'inicio_turno';
    const jogadorAtual = gameState.jogadores.find(
      p => p.id === gameState.partida.id_jogador_da_vez
    );
    console.log(
      `--- NOVO TURNO: Turno ${gameState.partida.turno_atual}, Vez de ${jogadorAtual.nome} ---`
    );
    this.processarFaseAtual();
  },
  executarRolagemDado: function () {
    const rolagem = Math.floor(Math.random() * 6) + 1;
    console.log(`Resultado do dado: ${rolagem}`);
    uiController.mostrarMensagemTemporaria(`Dado rolou: ${rolagem}!`, 1500);
    setTimeout(() => this.iniciarMovimento(rolagem), 1500);
  },
  iniciarMovimento: function (passos) {
    gameState.partida.fase_do_turno = 'movimento';
    uiController.atualizarFaseUI();
    this.executarUmPasso(passos);
  },
  executarUmPasso: function (passosRestantes) {
    uiController.mostrarPassosRestantes(passosRestantes);
    const jogadorAtual = gameState.jogadores.find(
      p => p.id === gameState.partida.id_jogador_da_vez
    );
    const pontoAtual = gameData.mapa.find(p => p.id === jogadorAtual.posicao_mapa_id);
    if (pontoAtual.tipo === 'bifurcacao') {
      console.log('Pausa na bifurcação.');
      gameState.partida.fase_do_turno = 'escolha_bifurcacao';
      gameState.partida.passosRestantesMovimento = passosRestantes;
      uiController.atualizarTudo();
      mapController.destacarOpcoesBifurcacao(pontoAtual.conexoes);
      return;
    }
    if (passosRestantes <= 0) {
      this.avancarParaProximaFase('aterrissagem');
      return;
    }
    if (!pontoAtual || pontoAtual.conexoes.length === 0) {
      this.avancarParaProximaFase('aterrissagem');
      return;
    }
    const proximoPontoId = pontoAtual.conexoes[0];
    jogadorAtual.posicao_mapa_id = proximoPontoId;
    mapController.atualizarPosicaoPeoes();
    setTimeout(() => this.executarUmPasso(passosRestantes - 1), 500);
  },
  calcularValorEfeito: function (efeitoBase) {
    let valorFinal = efeitoBase.valor_base;
    const eventoAtivo = gameState.partida.evento_global_ativo;
    if (eventoAtivo) {
      if (eventoAtivo.id === 'era_de_ouro' && efeitoBase.tipo === 'ganhar_moedas') {
        console.log("Evento 'Era de Ouro' ativo! Moedas dobradas.");
        valorFinal *= 2;
      }
    }
    return valorFinal;
  },
  jogadorClicouNaGrade: function (x, y) {
    if (gameState.partida.fase_do_turno !== 'escolha_bifurcacao') return;
    const pontoClicado = gameData.mapa.find(p => p.x === x && p.y === y);
    if (!pontoClicado) return;
    const jogadorAtual = gameState.jogadores.find(
      p => p.id === gameState.partida.id_jogador_da_vez
    );
    const pontoAtualNoMapa = gameData.mapa.find(p => p.id === jogadorAtual.posicao_mapa_id);
    if (pontoAtualNoMapa.conexoes.includes(pontoClicado.id)) {
      this.jogadorEscolheuCaminho(pontoClicado.id);
    }
  },
  jogadorEscolheuCaminho: function (pontoEscolhidoId) {
    console.log(`Caminho escolhido: ID ${pontoEscolhidoId}`);
    mapController.limparDestaquesBifurcacao();
    const jogadorAtual = gameState.jogadores.find(
      p => p.id === gameState.partida.id_jogador_da_vez
    );
    jogadorAtual.posicao_mapa_id = pontoEscolhidoId;
    mapController.atualizarPosicaoPeoes();
    const passosRestantes = gameState.partida.passosRestantesMovimento;
    gameState.partida.passosRestantesMovimento = 0;
    gameState.partida.fase_do_turno = 'movimento';
    uiController.atualizarTudo();
    setTimeout(() => this.executarUmPasso(passosRestantes), 500);
  },
  jogadorClicouAcao: function () {
    if (gameState.partida.fase_do_turno === 'uso_item_pre_rolagem') {
      this.avancarParaProximaFase('rolagem_dado');
    }
  },

  aplicarEfeitoDaCasa: function () {
    console.log('Aplicando efeito da casa...');
    const jogadorAtual = gameState.jogadores.find(
      p => p.id === gameState.partida.id_jogador_da_vez
    );
    const pontoAtual = gameData.mapa.find(p => p.id === jogadorAtual.posicao_mapa_id);

    if (!pontoAtual || !pontoAtual.tipoCasa) {
      this.avancarParaProximaFase();
      return;
    }

    let efeitoAplicado = false;
    switch (pontoAtual.tipoCasa) {
      case 'azul':
      case 'vermelha':
        this.executarEfeitoMoeda(pontoAtual, jogadorAtual);
        efeitoAplicado = true;
        break;
      case 'verde':
        this.executarEfeitoEvento(jogadorAtual);
        efeitoAplicado = true;
        break;
    }

    if (!efeitoAplicado) {
      this.avancarParaProximaFase();
    }
  },

  executarEfeitoMoeda: function (pontoAtual, jogadorAtual) {
    const definicaoCasa = gameData.gameDefinitions.casas[pontoAtual.tipoCasa];
    const efeitoBase = definicaoCasa.efeito;
    const valorCalculado = this.calcularValorEfeito(efeitoBase);
    if (efeitoBase.tipo === 'ganhar_moedas') {
      jogadorAtual.moedas += valorCalculado;
      uiController.mostrarMensagemTemporaria(
        `Casa Azul! Você ganhou ${valorCalculado} moedas!`,
        2000
      );
    } else if (efeitoBase.tipo === 'perder_moedas') {
      const moedasPerdidas = Math.min(jogadorAtual.moedas, valorCalculado);
      jogadorAtual.moedas -= moedasPerdidas;
      uiController.mostrarMensagemTemporaria(
        `Casa Vermelha! Você perdeu ${moedasPerdidas} moedas!`,
        2000
      );
    }
    uiController.atualizarTudo();
    this.avancarParaProximaFase();
  },

  executarEfeitoEvento: function (jogadorAtual) {
    const listaEventos = gameData.gameDefinitions.eventos_casa_interrogacao;

    if (!listaEventos || listaEventos.length === 0) {
      console.error(
        "ERRO CRÍTICO: A lista 'eventos_casa_interrogacao' não foi encontrada ou está vazia em game-data.js"
      );
      this.avancarParaProximaFase();
      return;
    }

    const eventoSorteado = listaEventos[Math.floor(Math.random() * listaEventos.length)];

    console.log(`Evento sorteado: ${eventoSorteado.nome}`);
    uiController.mostrarNotificacaoEvento(
      eventoSorteado.nome,
      eventoSorteado.efeito_detalhado,
      4000
    );

    setTimeout(() => {
      switch (eventoSorteado.id) {
        case 'chuva_de_moedas':
          gameState.jogadores.forEach(p => (p.moedas += 5));
          break;
        case 'imposto_coletivo':
          gameState.jogadores.forEach(p => (p.moedas = Math.max(0, p.moedas - 5)));
          break;
        case 'roleta_da_sorte':
          if (Math.random() < 0.5) {
            jogadorAtual.moedas += 10;
            console.log('Resultado da Roleta: Ganhou 10 moedas.');
          } else {
            console.log('Resultado da Roleta: Ganhou um item (lógica futura).');
          }
          break;
      }
      uiController.atualizarTudo();
      this.avancarParaProximaFase();
    }, 4500);
  },
};

export default gameManager;
