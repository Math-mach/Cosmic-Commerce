const API_BASE = "http://localhost:7000/api/user";
let socket = null;

// Views
const loginView = document.getElementById("login-view");
const registerView = document.getElementById("register-view");
const lobbyView = document.getElementById("lobby-view");
const chatView = document.getElementById("ws-section"); // Agora é a "Room View"

// Elementos de Autenticação
const authMessage = document.getElementById("auth-message");

// Elementos do Lobby
const publicRoomsList = document.getElementById("public-rooms-list");
const privateRoomCodeInput = document.getElementById("private-room-code");
const joinPrivateRoomBtn = document.getElementById("join-private-room-btn");
const createRoomBtn = document.getElementById("create-room-btn");

// Elementos da Sala (Room View)
const roomNameDisplay = document.getElementById("room-name-display");
const roomIdDisplay = document.getElementById("room-id-display");
const roomPlayersDisplay = document.getElementById("room-players-display");
const messagesDiv = document.getElementById("messages");
const wsInput = document.getElementById("ws-input");
const leaveRoomBtn = document.getElementById("leave-room-btn");

// Inicialização e Autenticação (sem mudanças)
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
function showView(view) {
    loginView.style.display = "none";
    registerView.style.display = "none";
    lobbyView.style.display = "none";
    chatView.style.display = "none";
    if (view === "login") loginView.style.display = "block";
    if (view === "register") registerView.style.display = "block";
    if (view === "lobby") lobbyView.style.display = "block";
    if (view === "chat") chatView.style.display = "block";
}
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
const logout = async () => {
    if (socket) socket.close();
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

// LOBBY
function showLobby(user) {
    showView("lobby");
    document.getElementById("lobby-username").textContent = user.name;
    connectWebSocket();
}

function renderRoomList(rooms) {
    publicRoomsList.innerHTML = "";
    if (rooms.length === 0) {
        publicRoomsList.innerHTML = "<p>Não há salas públicas disponíveis.</p>";
        return;
    }
    rooms.forEach((room) => {
        const roomItem = document.createElement("div");
        roomItem.className = "room-item";
        roomItem.innerHTML = `<div class="room-details"><span class="room-name">${room.name}</span><span class="room-players">${room.current_users} / ${room.max_users} players</span></div><button class="join-room-btn" data-room-id="${room.id}">Entrar</button>`;
        publicRoomsList.appendChild(roomItem);
    });
}

function joinRoom(roomId) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        alert("Erro: WebSocket não está conectado.");
        return;
    }
    socket.send(JSON.stringify({ type: "join_room", payload: { roomId } }));
}

publicRoomsList.addEventListener("click", (e) => {
    if (e.target && e.target.classList.contains("join-room-btn")) {
        const roomId = e.target.dataset.roomId;
        joinRoom(roomId);
    }
});
joinPrivateRoomBtn.addEventListener("click", () => {
    const roomId = privateRoomCodeInput.value.trim();
    if (roomId) {
        joinRoom(roomId);
        privateRoomCodeInput.value = "";
    } else {
        alert("Insira o código da sala privada.");
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
    socket.send(JSON.stringify({ type: "get_rooms" })); // Pede a lista de salas atualizada
});
// ----------------------------------------------------

// ATUALIZA A TELA DA SALA COM AS INFORMAÇÕES RECEBIDAS
function updateRoomView(roomData) {
    roomIdDisplay.textContent = roomData.id;
    roomNameDisplay.textContent = roomData.name || "Sala de Jogo"; // Usa o nome da sala ou um padrão
    roomPlayersDisplay.textContent = `${roomData.current_users} / ${roomData.max_users}`;
    messagesDiv.innerHTML = ""; // Limpa o chat ao entrar na sala
}

// WebSocket
function connectWebSocket() {
    socket = new WebSocket("ws://localhost:7000");

    socket.onopen = () => {
        console.log("WebSocket Conectado.");
        socket.send(JSON.stringify({ type: "get_rooms" }));
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log("Mensagem recebida do WS:", data);

            switch (data.event) {
                // LOBBY
                case "room_list":
                    renderRoomList(data.rooms);
                    break;
                case "join_error":
                    alert(`Erro ao entrar na sala: ${data.message}`);
                    break;

                // --- EVENTO CENTRALIZADO PARA INFORMAÇÕES DA SALA ---
                case "room_info":
                    updateRoomView(data.room);
                    showView("chat"); // Mostra a tela da sala
                    break;

                // CHAT & JOGO
                case "chat_echo":
                    appendMessage(`📝 Você: ${data.message}`);
                    break;
                case "chat_message":
                    appendMessage(`💬 ${data.from}: ${data.message}`);
                    break;
                case "game_start":
                    appendMessage(`🎮 ${data.message}`);
                    break;

                // GERAL
                case "error":
                    alert(`❌ Erro do servidor: ${data.message}`);
                    break;
                default:
                    console.log("Evento desconhecido recebido: ", data);
            }
        } catch (err) {
            console.error("Erro ao processar mensagem do WebSocket:", err);
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

// Ações do Chat/Jogo (sem mudanças)
document.getElementById("send-chat").addEventListener("click", () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
    }
    const message = wsInput.value.trim();
    if (!message) return;
    socket.send(JSON.stringify({ type: "chat", payload: message }));
    wsInput.value = "";
});
document.getElementById("send-game").addEventListener("click", () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
    }
    socket.send(JSON.stringify({ type: "game_start" }));
});

function appendMessage(msg) {
    const p = document.createElement("p");
    p.textContent = msg;
    messagesDiv.appendChild(p);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
