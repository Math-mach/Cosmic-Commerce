import gameData from "./game-data.js";
import gameState from "./game-state.js";
import uiController from "./ui-controller.js";
import mapController from "./map-controller.js";

let socket = null;

let actionButtonListener = null;
let gridClickListener = null;

let voteButtonListener = null;

export function initGame(initialState, socketInstance, meuId) {
    console.log("Módulo do Jogo: Iniciando com o estado:", initialState);

    socket = socketInstance;
    gameState.meuId = meuId;

    gameState.jogadores = initialState.players;
    gameState.partida = initialState.turnInfo;

    mapController.construirTabuleiro();
    mapController.pintarVariosPontos(gameData.pontosParaPintar);
    mapController.criarPeoes(gameState.jogadores);
    mapController.atualizarPosicaoPeoes();
    uiController.inicializarUI();
    uiController.atualizarTudo();

    addGameListeners();
}

export function handleServerUpdate(updateData) {
    console.log(
        "Módulo do Jogo: Recebendo atualização do servidor:",
        updateData
    );

    const { type, payload } = updateData;

    switch (type) {
        case "gameStateUpdate":
            gameState.jogadores = payload.players;
            gameState.partida = payload.turnInfo;
            uiController.atualizarTudo();
            mapController.atualizarPosicaoPeoes();

            if (
                payload.turnInfo.fase_do_turno === "escolha_bifurcacao" &&
                gameState.meuId === payload.turnInfo.id_jogador_da_vez
            ) {
                mapController.destacarOpcoesBifurcacao(
                    payload.turnInfo.opcoesBifurcacao
                );
            } else {
                mapController.limparDestaquesBifurcacao();
            }

            break;

        case "player_is_moving":
            console.log(
                `Animando movimento para o jogador ${payload.playerId}`
            );

            if (payload.diceResult) {
                uiController.mostrarMensagemTemporaria(
                    `Dado rolou: ${payload.diceResult}!`,
                    1500
                );
            }

            const animateStep = (stepIndex) => {
                if (stepIndex >= payload.path.length) return;

                const nodeId = payload.path[stepIndex];
                const playerState = gameState.jogadores.find(
                    (p) => p.id === payload.playerId
                );

                if (playerState) {
                    playerState.posicao_mapa_id = nodeId;

                    mapController.atualizarPosicaoPeoes();
                }

                setTimeout(() => animateStep(stepIndex + 1), 500);
            };

            const delay = payload.diceResult ? 1500 : 0;
            setTimeout(() => animateStep(0), delay);
            break;

        case "show_notification":
            console.log(`Exibindo notificação:`, payload);

            if (payload.isEvent && payload.title) {
                uiController.mostrarNotificacaoEvento(
                    payload.title,
                    payload.message,
                    payload.duration
                );
            } else {
                uiController.mostrarMensagemTemporaria(
                    payload.message,
                    payload.duration
                );
            }
            break;

        case "player_disconnected_ingame":
            uiController.showDisconnectionModal(payload);
            break;

        case "player_reconnected":
            uiController.hideDisconnectionModal();
            uiController.mostrarNotificacaoEvento(
                "Jogador Reconectado!",
                `${payload.playerName} voltou ao jogo.`,
                3000
            );
            break;

        case "player_removed_ingame":
        case "player_removed_by_vote":
            uiController.hideDisconnectionModal();
            mapController.removerPeao(payload.playerId);
            gameState.jogadores = gameState.jogadores.filter(
                (p) => p.id !== payload.playerId
            );
            uiController.atualizarPainelJogadores();
            uiController.mostrarNotificacaoEvento(
                "Jogador Removido",
                `${payload.playerName} foi removido da partida.`,
                4000
            );
            break;

        case "vote_update":
            uiController.updateVoteCount(payload.votes, payload.votedFor);
            break;
    }
}

export function cleanupGame() {
    console.log("Módulo do Jogo: Limpando recursos.");
    if (actionButtonListener) {
        document
            .getElementById("action-button")
            ?.removeEventListener("click", actionButtonListener);
        actionButtonListener = null;
    }
    uiController.hideDisconnectionModal();

    document.getElementById("ui-players-panel").innerHTML = "";
    document.getElementById("unified-grid-container").innerHTML =
        '<div id="peoes-container"></div>';
}

function addGameListeners() {
    const actionButton = document.getElementById("action-button");

    actionButtonListener = () => {
        console.log("Botão de ação do jogo clicado.");
        sendActionToServer("player_action", { action: "main_button_click" });
    };
    actionButton.addEventListener("click", actionButtonListener);

    const voteButton = document.getElementById("vote-to-expel-btn");
    if (voteButton) {
        voteButtonListener = () => {
            const playerIdToExpel = voteButton.dataset.playerId;
            if (playerIdToExpel) {
                console.log(`Votando para expulsar ${playerIdToExpel}`);
                sendActionToServer("vote_to_expel", { playerIdToExpel });
                voteButton.disabled = true;
            }
        };
        voteButton.addEventListener("click", voteButtonListener);
    }

    gridClickListener = (x, y) => {
        if (gameState.partida?.fase_do_turno === "escolha_bifurcacao") {
            const pontoClicado = gameData.mapa.find(
                (p) => p.x === x && p.y === y
            );

            if (
                pontoClicado &&
                gameState.partida.opcoesBifurcacao?.includes(pontoClicado.id)
            ) {
                console.log(
                    `Jogador escolheu o caminho: ID ${pontoClicado.id}`
                );

                mapController.limparDestaquesBifurcacao();

                if (gameState.partida) {
                    gameState.partida.fase_do_turno = "movimento";
                }

                uiController.atualizarFaseUI();

                sendActionToServer("player_action", {
                    action: "choose_path",
                    nodeId: pontoClicado.id,
                });
            }
        }
    };
    mapController.addGridClickListener(gridClickListener);
}

function sendActionToServer(type, payload) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.error(
            "Módulo do Jogo: Tentativa de enviar ação sem socket conectado."
        );
        return;
    }
    console.log(
        `Módulo do Jogo: Enviando ação para o servidor -> Tipo: ${type}, Payload:`,
        payload
    );
    socket.send(JSON.stringify({ type, payload }));
}
