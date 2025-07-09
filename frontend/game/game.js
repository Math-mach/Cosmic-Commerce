import gameData from "./game-data.js";
import gameState from "./game-state.js";
import uiController from "./ui-controller.js";
import mapController from "./map-controller.js";

let socket = null;

let actionButtonListener = null;
let gridClickListener = null;

export function initGame(initialState, socketInstance) {
    console.log("Módulo do Jogo: Iniciando com o estado:", initialState);

    socket = socketInstance;

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

    gridClickListener = (x, y) => {
        const pontoClicado = gameData.mapa.find((p) => p.x === x && p.y === y);
        if (pontoClicado) {
            console.log(`Célula do grid clicada: ID ${pontoClicado.id}`);
            sendActionToServer("player_action", {
                action: "grid_click",
                nodeId: pontoClicado.id,
            });
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
