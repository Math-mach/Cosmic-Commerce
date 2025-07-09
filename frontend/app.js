import * as gameModule from "./game/game.js";

const API_BASE = "/api/user";
let socket = null;

// Views
const loginView = document.getElementById("login-view");
const registerView = document.getElementById("register-view");
const lobbyView = document.getElementById("lobby-view");
const chatView = document.getElementById("ws-section");
const gameView = document.getElementById("game-view");

// Elementos de Autenticação
const authMessage = document.getElementById("auth-message");

// Elementos do Lobby
const publicRoomsList = document.getElementById("public-rooms-list");
const privateRoomCodeInput = document.getElementById("private-room-code");
const joinPrivateRoomBtn = document.getElementById("join-private-room-btn");
const createRoomBtn = document.getElementById("create-room-btn");

// Elementos do Chat
const roomNameDisplay = document.getElementById("room-name-display");
const roomIdDisplay = document.getElementById("room-id-display");
const roomPlayersDisplay = document.getElementById("room-players-display");
const messagesDiv = document.getElementById("messages");
const wsInput = document.getElementById("ws-input");
const leaveRoomBtn = document.getElementById("leave-room-btn");

// Inicializa app
window.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await fetch(`${API_BASE}/me`, { credentials: "include" });
        if (!res.ok) throw new Error("Não autenticado");
        const { user } = await res.json();
        showLobby(user);
    } catch (err) {
        showView("login");
    }
});

// VIEW HANDLING
function showView(view) {
    loginView.style.display = "none";
    registerView.style.display = "none";
    lobbyView.style.display = "none";
    chatView.style.display = "none";
    gameView.style.display = "none";

    if (view === "login") loginView.style.display = "block";
    if (view === "register") registerView.style.display = "block";
    if (view === "lobby") lobbyView.style.display = "block";
    if (view === "chat") chatView.style.display = "block";
    if (view === "game") gameView.style.display = "block";
}

// NAVIGATION & AUTH
document.getElementById("go-to-register").onclick = () => {
    showView("register");
    authMessage.textContent = "";
};
document.getElementById("go-to-login").onclick = () => {
    showView("login");
    authMessage.textContent = "";
};

document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    authMessage.textContent = "";
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) throw new Error("Falha no login");
        const { user } = await res.json();
        showLobby(user);
    } catch (err) {
        authMessage.textContent = "Erro no login";
    }
});

document
    .getElementById("register-form")
    .addEventListener("submit", async (e) => {
        e.preventDefault();
        authMessage.textContent = "";
        const name = document.getElementById("register-name").value;
        const email = document.getElementById("register-email").value;
        const password = document.getElementById("register-password").value;
        try {
            const res = await fetch(`${API_BASE}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ name, email, password }),
            });
            if (!res.ok) throw new Error("Falha no registro");
            authMessage.style.color = "green";
            authMessage.textContent = "Registrado com sucesso! Faça login.";
            showView("login");
        } catch (err) {
            authMessage.style.color = "red";
            authMessage.textContent = "Erro no registro";
        }
    });

// LOBBY
function showLobby(user) {
    showView("lobby");
    document.getElementById("lobby-username").textContent = user.name;
    connectWebSocket();
}

// RENDERIZA A LISTA DE SALAS PÚBLICAS
function renderRoomList(rooms) {
    publicRoomsList.innerHTML = "";
    if (rooms.length === 0) {
        publicRoomsList.innerHTML =
            "<p>Não há salas públicas disponíveis no momento.</p>";
        return;
    }

    rooms.forEach((room) => {
        const roomItem = document.createElement("div");
        roomItem.className = "room-item";
        roomItem.innerHTML = `
            <div class="room-details">
                <span class="room-name">${room.name}</span>
                <span class="room-players">${room.current_users} / ${room.max_users} players</span>
            </div>
            <button class="join-room-btn" data-room-id="${room.id}">Entrar</button>
        `;
        publicRoomsList.appendChild(roomItem);
    });
}

// FUNÇÃO PARA ENTRAR NA SALA (VIA WEBSOCKET)
function joinRoom(roomId) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        alert("Erro: WebSocket não está conectado.");
        return;
    }
    socket.send(JSON.stringify({ type: "join_room", payload: { roomId } }));
}

// Event listener para salas públicas (usando delegação de eventos)
publicRoomsList.addEventListener("click", (e) => {
    if (e.target && e.target.classList.contains("join-room-btn")) {
        const roomId = e.target.dataset.roomId;
        joinRoom(roomId);
    }
});

// Event listener para sala privada
joinPrivateRoomBtn.addEventListener("click", () => {
    const roomId = privateRoomCodeInput.value.trim();
    if (roomId) {
        joinRoom(roomId);
        privateRoomCodeInput.value = "";
    } else {
        alert("Por favor, insira o código da sala privada.");
    }
});

// --- NOVA LÓGICA DE CRIAÇÃO E SAÍDA DE SALA ---
createRoomBtn.addEventListener("click", () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        alert("Erro: WebSocket não está conectado.");
        return;
    }
    socket.send(JSON.stringify({ type: "create_room" }));
});

leaveRoomBtn.addEventListener("click", () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        alert("Erro: WebSocket não está conectado.");
        return;
    }
    socket.send(JSON.stringify({ type: "leave_room" }));
    showView("lobby"); // Volta para o lobby imediatamente
    messagesDiv.innerHTML = "";

    socket.send(JSON.stringify({ type: "get_rooms" }));
});

function updateRoomView(roomData) {
    roomIdDisplay.textContent = roomData.id;
    roomNameDisplay.textContent = roomData.name || "Sala de Jogo";
    roomPlayersDisplay.textContent = `${roomData.current_users} / ${roomData.max_users}`;
}

// WebSocket
function connectWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    socket = new WebSocket(wsUrl);
    socket.onopen = () => {
        console.log("WebSocket Conectado.");
        socket.send(JSON.stringify({ type: "get_rooms" }));
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log("Mensagem recebida do WS:", data);

            switch (data.event) {
                case "room_list":
                    renderRoomList(data.rooms);
                    break;
                case "join_success":
                    showView("chat");
                    appendMessage(`✅ Entrou na sala: ${data.roomName}`);
                    break;
                case "join_error":
                    alert(`Erro ao entrar na sala: ${data.message}`);
                    break;

                case "room_info":
                    if (lobbyView.style.display === "block") {
                        showView("chat");
                        appendMessage(`Bem-vindo à sala!`);
                    }
                    updateRoomView(data.room);
                    break;

                // EVENTOS DO CHAT
                case "chat_echo":
                    appendMessage(`📝 Você: ${data.message}`);
                    break;
                case "chat_message":
                    appendMessage(`💬 ${data.from}: ${data.message}`);
                    break;

                // NOVO: EVENTOS DO JOGO
                case "game_started":
                    console.log(
                        "O servidor iniciou o jogo! Mudando para a tela do jogo."
                    );
                    showView("game");
                    gameModule.initGame(data.payload, socket);
                    break;

                case "gameStateUpdate":
                case "game_event":
                    if (gameView.style.display === "block") {
                        gameModule.handleServerUpdate(data.payload);
                    }
                    break;

                // EVENTOS GERAIS
                case "error":
                    appendMessage(`❌ Erro do servidor: ${data.message}`);
                    break;
                default:
                    console.log("Evento desconhecido recebido: ", data);
            }
        } catch (err) {
            console.error("Erro ao processar mensagem do WebSocket:", err);
            appendMessage("❌ Mensagem inválida recebida: " + event.data);
        }
    };

    socket.onerror = (err) => {
        console.error("Erro no WebSocket:", err);
    };
    socket.onclose = () => {
        console.log("🔌 WebSocket desconectado");
        showView("login");
    };
}

// Enviar mensagens (Chat View)
document.getElementById("send-chat").addEventListener("click", () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        appendMessage("⚠️ WebSocket não conectado");
        return;
    }
    const message = wsInput.value.trim();
    if (!message) return;
    socket.send(JSON.stringify({ type: "chat", payload: message }));
    wsInput.value = "";
});

document.getElementById("send-game").addEventListener("click", () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        appendMessage("⚠️ WebSocket não conectado");
        return;
    }
    socket.send(JSON.stringify({ type: "start_game" }));
});

// Logout
const logout = async () => {
    if (socket) socket.close();
    gameModule.cleanupGame();

    try {
        await fetch(`${API_BASE}/logout`, {
            method: "POST",
            credentials: "include",
        });
    } catch {}
    showView("login");
    authMessage.textContent = "";
    authMessage.style.color = "red";
    messagesDiv.innerHTML = "";
};

document.getElementById("lobby-logout-btn").addEventListener("click", logout);

function appendMessage(msg) {
    const p = document.createElement("p");
    p.textContent = msg;
    messagesDiv.appendChild(p);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
