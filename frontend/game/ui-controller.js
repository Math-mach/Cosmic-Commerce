import gameState from "./game-state.js";

const FASES_UI = {
    inicio_turno: {
        titulo: "Início do Turno",
        acoes: ["Aguarde... Efeitos automáticos."],
    },
    uso_item_pre_rolagem: {
        titulo: "Fase de Ação",
        acoes: ["Usar Item", "Rolar o Dado"],
    },
    rolagem_dado: { titulo: "Fase de Rolagem", acoes: ["Rolando o dado..."] },
    movimento: { titulo: "Fase de Movimento", acoes: ["Movendo peão..."] },
    aterrissagem: {
        titulo: "Fase de Aterrissagem",
        acoes: ["Resolvendo efeito da casa..."],
    },
    fim_turno: { titulo: "Fim do Turno", acoes: ["Passando a vez..."] },
    escolha_bifurcacao: {
        titulo: "Bifurcação!",
        acoes: ["Clique no caminho que deseja seguir."],
    },
};

const uiController = {
    inicializarUI: function () {
        this.atualizarPainelJogadores();
    },

    atualizarPainelJogadores: function () {
        const playersPanel = document.getElementById("ui-players-panel");
        if (!playersPanel) return;
        playersPanel.innerHTML = "";

        const jogadorAtualId = gameState.partida?.id_jogador_da_vez;
        const jogadores = gameState.jogadores || [];

        jogadores.forEach((player) => {
            const card = document.createElement("div");
            card.className = "player-card";
            card.id = `player-card-${player.id}`;
            if (player.id === jogadorAtualId) {
                card.classList.add("active-player");
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
        const gameInfo = document.getElementById("game-info");
        if (!gameInfo || !gameState.partida?.id_jogador_da_vez) return;

        const jogadorAtual = gameState.jogadores.find(
            (p) => p.id === gameState.partida.id_jogador_da_vez
        );
        if (!jogadorAtual) return;

        gameInfo.textContent = `Turno: ${gameState.partida.turno_atual} - Vez de: ${jogadorAtual.nome}`;
    },

    desabilitarBotaoAcao: function () {
        const actionButton = document.getElementById("action-button");
        if (actionButton) {
            actionButton.textContent = "Aguarde...";
            actionButton.disabled = true;
        }
    },

    mostrarPassosRestantes: function (passos) {
        const gameInfo = document.getElementById("game-info");
        if (gameInfo) {
            gameInfo.textContent = `Movendo... Passos restantes: ${passos}`;
        }
    },

    mostrarMensagemTemporaria: function (texto, duracaoMs) {
        const gameInfo = document.getElementById("game-info");
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

        const uiData = FASES_UI[faseAtual] || {
            titulo: "Aguardando Servidor",
            acoes: [],
        };

        const phaseTitle = document.getElementById("phase-title");
        if (phaseTitle) phaseTitle.textContent = uiData.titulo;

        const actionsList = document.getElementById("phase-actions");
        if (actionsList) {
            actionsList.innerHTML = "";
            uiData.acoes.forEach((acao) => {
                const li = document.createElement("li");
                li.textContent = acao;
                actionsList.appendChild(li);
            });
        }

        const actionButton = document.getElementById("action-button");
        if (actionButton) {
            if (faseAtual === "uso_item_pre_rolagem") {
                actionButton.textContent = "Rolar o Dado";
                actionButton.disabled = false;
            } else {
                this.desabilitarBotaoAcao();
            }
        }
    },

    mostrarNotificacaoEvento: function (titulo, descricao, duracaoMs) {
        const notificacaoAntiga = document.querySelector(
            "#game-view .event-notification"
        );
        if (notificacaoAntiga) notificacaoAntiga.remove();

        const notificacao = document.createElement("div");
        notificacao.className = "event-notification";
        notificacao.innerHTML = `<h4>${titulo}</h4><p>${descricao}</p>`;

        document.getElementById("game-view")?.appendChild(notificacao);

        getComputedStyle(notificacao).opacity;

        notificacao.classList.add("visible");

        setTimeout(() => {
            notificacao.classList.remove("visible");
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
