const API_BASE = "http://localhost:7000/api/user";
let socket = null;

// Views
const loginView = document.getElementById("login-view");
const registerView = document.getElementById("register-view");
const chatView = document.getElementById("ws-section");

const messagesDiv = document.getElementById("messages");
const wsInput = document.getElementById("ws-input");
const authMessage = document.getElementById("auth-message");

// Inicializa app
window.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await fetch(`${API_BASE}/me`, {
            credentials: "include",
        });

        if (!res.ok) throw new Error("Não autenticado");

        const user = await res.json();
        startChat(user);
    } catch (err) {
        showView("login");
    }
});

// VIEW HANDLING
function showView(view) {
    loginView.style.display = "none";
    registerView.style.display = "none";
    chatView.style.display = "none";

    if (view === "login") loginView.style.display = "block";
    if (view === "register") registerView.style.display = "block";
    if (view === "chat") chatView.style.display = "block";
}

// NAVIGATION LINKS
document.getElementById("go-to-register").onclick = () => {
    showView("register");
    authMessage.textContent = "";
};

document.getElementById("go-to-login").onclick = () => {
    showView("login");
    authMessage.textContent = "";
};

// LOGIN
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

        const user = await res.json();
        startChat(user);
    } catch (err) {
        authMessage.textContent = "Erro no login";
    }
});

// REGISTRO
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

// CONECTA AO CHAT (WebSocket)
function startChat(user) {
    showView("chat");
    connectWebSocket();
}

// WebSocket
function connectWebSocket() {
    socket = new WebSocket("ws://localhost:7000");

    socket.onopen = () => {
        appendMessage("✅ Conectado ao WebSocket");
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            switch (data.event) {
                case "connected":
                    appendMessage("✅ " + data.message);
                    break;
                case "chat_echo":
                    appendMessage("📝 Você: " + data.message);
                    break;
                case "chat_message":
                    appendMessage("💬 " + data.from + ": " + data.message);
                    break;
                case "game_start":
                    appendMessage("🎮 " + data.message);
                    break;
                case "error":
                    appendMessage("❌ Erro: " + data.message);
                    break;
                default:
                    appendMessage("📩 Evento desconhecido: " + event.data);
            }
        } catch (err) {
            appendMessage("❌ Mensagem inválida: " + event.data);
        }
    };

    socket.onerror = (err) => {
        appendMessage("❌ Erro no WebSocket");
        console.error(err);
    };

    socket.onclose = () => {
        appendMessage("🔌 WebSocket desconectado");
    };
}

// Enviar mensagens
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

    socket.send(JSON.stringify({ type: "game_start" }));
    appendMessage("🎮 Pedido para iniciar jogo enviado");
});

// Logout
document.getElementById("logout-btn").addEventListener("click", async () => {
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
    appendMessage("🚪 Saiu da conta");
});

function appendMessage(msg) {
    const p = document.createElement("p");
    p.textContent = msg;
    messagesDiv.appendChild(p);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
