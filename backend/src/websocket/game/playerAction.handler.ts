import { ConnectedUser } from "..";
import { roomManager } from "../managers/roomManager";
import { Room } from "../managers/Room";
import { findNodeById, gameDefinitions } from "./gameData";

interface PlayerActionPayload {
    action: "main_button_click" | "choose_path";
    nodeId?: number;
    [key: string]: any;
}

export function handlePlayerAction(
    user: ConnectedUser,
    payload: PlayerActionPayload
) {
    const { roomId, id: userId } = user;

    if (!roomId) {
        user.ws.send(
            JSON.stringify({
                event: "error",
                message: "Você não está em um jogo ativo.",
            })
        );
        return;
    }

    const room = roomManager.findRoomById(roomId);
    if (!room || room.state !== "in_progress" || !room.gameState) {
        user.ws.send(
            JSON.stringify({
                event: "error",
                message: "O jogo na sua sala não está ativo.",
            })
        );
        return;
    }

    if (room.gameState.turnInfo.id_jogador_da_vez !== userId) {
        user.ws.send(
            JSON.stringify({
                event: "error",
                message: "Não é a sua vez de jogar.",
            })
        );
        return;
    }

    switch (payload.action) {
        case "main_button_click":
            handleMainButtonClick(room);
            break;
        case "choose_path":
            handleChoosePath(room, user.id, payload.nodeId!);
            break;
        default:
            user.ws.send(
                JSON.stringify({
                    event: "error",
                    message: "Ação desconhecida.",
                })
            );
            break;
    }
}

function handleMainButtonClick(room: Room) {
    const { turnInfo, players: playerStates } = room.gameState!;

    if (turnInfo.fase_do_turno !== "uso_item_pre_rolagem") {
        console.warn(
            `[Sala ${room.id}] Ação inválida na fase: ${turnInfo.fase_do_turno}`
        );
        return;
    }

    turnInfo.fase_do_turno = "rolagem_dado";
    roomManager.broadcastToRoom(
        room.id,
        JSON.stringify({
            event: "gameStateUpdate",
            payload: { type: "gameStateUpdate", payload: room.gameState! },
        })
    );

    const diceRoll = Math.floor(Math.random() * 6) + 1;
    console.log(
        `[Sala ${room.id}] Jogador ${turnInfo.id_jogador_da_vez} rolou ${diceRoll}`
    );

    const currentPlayerState = playerStates.find(
        (p) => p.id === turnInfo.id_jogador_da_vez
    )!;
    let currentNode = findNodeById(currentPlayerState.posicao_mapa_id);
    const path: number[] = [];
    let stoppedAtBifurcation = false;

    // =======================================================
    // ========= A CORREÇÃO ESTÁ NA CONDIÇÃO DO 'IF' =========
    // =======================================================
    for (let i = 0; i < diceRoll; i++) {
        if (!currentNode || currentNode.conexoes.length === 0) {
            break;
        }

        const nextNodeId = currentNode.conexoes[0];
        currentNode = findNodeById(nextNodeId)!;
        path.push(currentNode.id);

        // A CONDIÇÃO CORRIGIDA:
        // Agora ela para se o nó for uma bifurcação, PONTO.
        // A checagem de passos restantes é feita DEPOIS.
        if (currentNode.tipo === "bifurcacao") {
            const stepsRemaining = diceRoll - (i + 1);

            console.log(
                `[Sala ${room.id}] Pousou na bifurcação ${currentNode.id} com ${stepsRemaining} passos restantes.`
            );

            turnInfo.fase_do_turno = "escolha_bifurcacao";
            turnInfo.passosRestantes = stepsRemaining;
            turnInfo.opcoesBifurcacao = currentNode.conexoes;
            currentPlayerState.posicao_mapa_id = currentNode.id;

            roomManager.broadcastToRoom(
                room.id,
                JSON.stringify({
                    event: "gameStateUpdate",
                    payload: {
                        type: "gameStateUpdate",
                        payload: room.gameState!,
                    },
                })
            );

            stoppedAtBifurcation = true;
            break;
        }
    }

    if (!stoppedAtBifurcation) {
        // O resto da função permanece o mesmo
        const fullPath = [currentPlayerState.posicao_mapa_id, ...path];

        turnInfo.fase_do_turno = "movimento";
        roomManager.broadcastToRoom(
            room.id,
            JSON.stringify({
                event: "game_event",
                payload: {
                    type: "player_is_moving",
                    payload: {
                        playerId: currentPlayerState.id,
                        path: fullPath,
                        diceResult: diceRoll,
                    },
                },
            })
        );

        const animationDuration = fullPath.length * 500 + 1000;
        setTimeout(() => {
            const finalNodeId =
                path.length > 0
                    ? path[path.length - 1]
                    : currentPlayerState.posicao_mapa_id;
            processEndOfMovement(room, finalNodeId);
        }, animationDuration);
    }
}

function handleChoosePath(room: Room, userId: string, chosenNodeId: number) {
    const { turnInfo, players } = room.gameState!;

    if (
        turnInfo.fase_do_turno !== "escolha_bifurcacao" ||
        turnInfo.id_jogador_da_vez !== userId
    )
        return;

    const currentPlayerState = players.find((p) => p.id === userId)!;
    const currentNode = findNodeById(currentPlayerState.posicao_mapa_id)!;

    if (!currentNode.conexoes.includes(chosenNodeId)) return;

    turnInfo.opcoesBifurcacao = [];
    let stepsToMove = turnInfo.passosRestantes!;
    let currentPathNode = findNodeById(chosenNodeId)!;
    const path: number[] = [currentNode.id, currentPathNode.id];
    stepsToMove--;

    while (stepsToMove > 0 && currentPathNode) {
        const nextNodeId = currentPathNode.conexoes[0];
        const nextNode = findNodeById(nextNodeId);
        if (!nextNode) break;
        path.push(nextNode.id);
        currentPathNode = nextNode;
        stepsToMove--;
    }

    turnInfo.fase_do_turno = "movimento";
    roomManager.broadcastToRoom(
        room.id,
        JSON.stringify({
            event: "game_event",
            payload: {
                type: "player_is_moving",
                payload: { playerId: userId, path, diceResult: null },
            },
        })
    );

    const animationDuration = path.length * 500 + 500;
    setTimeout(() => {
        processEndOfMovement(room, path[path.length - 1]);
    }, animationDuration);
}

function processEndOfMovement(room: Room, finalNodeId: number) {
    const { turnInfo, players: playerStates } = room.gameState!;
    const currentPlayerState = playerStates.find(
        (p) => p.id === turnInfo.id_jogador_da_vez
    )!;

    console.log(
        `[Sala ${room.id}] Movimento terminado. Processando aterrissagem no nó ${finalNodeId}.`
    );

    currentPlayerState.posicao_mapa_id = finalNodeId;
    turnInfo.fase_do_turno = "aterrissagem";

    const finalNode = findNodeById(currentPlayerState.posicao_mapa_id);
    let notificationPayload = null; // Usaremos um objeto para a notificação

    if (finalNode && finalNode.tipoCasa) {
        const tipoCasa = finalNode.tipoCasa;
        if (tipoCasa === "azul" || tipoCasa === "vermelha") {
            const definicaoCasa = gameDefinitions.casas[tipoCasa];
            const efeito = definicaoCasa.efeito;
            if (efeito.tipo === "ganhar_moedas") {
                currentPlayerState.moedas += efeito.valor_base;
                notificationPayload = {
                    title: "Casa Azul!",
                    message: `Você ganhou ${efeito.valor_base} moedas!`,
                };
            } else if (efeito.tipo === "perder_moedas") {
                const moedasPerdidas = Math.min(
                    currentPlayerState.moedas,
                    efeito.valor_base
                );
                currentPlayerState.moedas -= moedasPerdidas;
                notificationPayload = {
                    title: "Casa Vermelha!",
                    message: `Você perdeu ${moedasPerdidas} moedas!`,
                };
            }

            // =========================================================
            // ========= NOVA LÓGICA PARA CASA VERDE ===================
            // =========================================================
        } else if (tipoCasa === "verde") {
            const eventos = gameDefinitions.eventos_casa_interrogacao;
            // Sorteia um evento aleatório da lista
            const eventoSorteado =
                eventos[Math.floor(Math.random() * eventos.length)];

            console.log(
                `[Sala ${room.id}] Evento sorteado: ${eventoSorteado.nome}`
            );

            // Aplica o efeito do evento sorteado
            switch (eventoSorteado.id) {
                case "chuva_de_moedas":
                    playerStates.forEach((p) => (p.moedas += 5));
                    break;
                case "imposto_coletivo":
                    playerStates.forEach(
                        (p) => (p.moedas = Math.max(0, p.moedas - 5))
                    );
                    break;
                case "roleta_da_sorte":
                    if (Math.random() < 0.5) {
                        currentPlayerState.moedas += 10;
                    }
                    break;
            }

            // Prepara a notificação especial para o evento
            notificationPayload = {
                title: eventoSorteado.nome,
                message: eventoSorteado.efeito_detalhado,
                isEvent: true, // Um marcador para o frontend saber que é uma notificação grande
            };
        }
    }

    // Envia a atualização de estado com as moedas modificadas
    roomManager.broadcastToRoom(
        room.id,
        JSON.stringify({
            event: "gameStateUpdate",
            payload: { type: "gameStateUpdate", payload: room.gameState! },
        })
    );

    // Se houver uma notificação, envia para o cliente
    if (notificationPayload) {
        roomManager.broadcastToRoom(
            room.id,
            JSON.stringify({
                event: "game_event",
                payload: {
                    type: "show_notification",
                    payload: { ...notificationPayload, duration: 4000 },
                },
            })
        );
    }

    // Agenda a passagem de turno
    setTimeout(() => {
        passTurn(room);
    }, 4500); // Aumentamos o tempo para dar ao jogador chance de ler o evento
}

function passTurn(room: Room) {
    const players = room.getPlayers();
    const currentPlayerId = room.gameState!.turnInfo.id_jogador_da_vez;
    const currentPlayerIndex = players.findIndex(
        (p) => p.id === currentPlayerId
    );
    if (currentPlayerIndex === -1) return;

    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    const nextPlayer = players[nextPlayerIndex];

    room.gameState!.turnInfo.id_jogador_da_vez = nextPlayer.id;
    room.gameState!.turnInfo.fase_do_turno = "uso_item_pre_rolagem";

    if (nextPlayerIndex === 0) {
        room.gameState!.turnInfo.turno_atual++;
    }

    console.log(`[Sala ${room.id}] Turno passado para ${nextPlayer.name}.`);

    const updatePayload = {
        event: "gameStateUpdate",
        payload: { type: "gameStateUpdate", payload: room.gameState! },
    };
    roomManager.broadcastToRoom(room.id, JSON.stringify(updatePayload));
}
