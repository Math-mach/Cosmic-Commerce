import * as gameModule from './game/game.js';
import uiController from './game/ui-controller.js';


const API_BASE = '/api/user';
let socket = null;
let currentUser = null;
let pingInterval = null;

// Views
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const lobbyView = document.getElementById('lobby-view');
const chatView = document.getElementById('ws-section');
const gameView = document.getElementById('game-view');

// Elementos de Autenticação
const authMessage = document.getElementById('auth-message');
const registerMessage = document.getElementById('register-message');

// Elementos do Lobby
const publicRoomsList = document.getElementById('public-rooms-list');
const privateRoomCodeInput = document.getElementById('private-room-code');
const joinPrivateRoomBtn = document.getElementById('join-private-room-btn');
const createRoomBtn = document.getElementById('create-room-btn');

// Elementos do Chat
const roomNameDisplay = document.getElementById('room-name-display');
const roomIdDisplay = document.getElementById('room-id-display');
const roomPlayersDisplay = document.getElementById('room-players-display');
const roomHostDisplay = document.getElementById('room-host-display');
const messagesDiv = document.getElementById('messages');
const wsInput = document.getElementById('ws-input');
const leaveRoomBtn = document.getElementById('leave-room-btn');
const sendChatBtn = document.getElementById('send-chat');

// Inicializa app
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch(`${API_BASE}/me`, { credentials: 'include' });
    if (!res.ok) throw new Error('Não autenticado');
    const { user } = await res.json();
    currentUser = user;
    showLobby(user);
  } catch (err) {
    showView('login');
  }
});

// VIEW HANDLING
function showView(view) {
  loginView.style.display = 'none';
  registerView.style.display = 'none';
  lobbyView.style.display = 'none';
  chatView.style.display = 'none';
  gameView.style.display = 'none';

  if (view === 'login') loginView.style.display = 'block';
  if (view === 'register') registerView.style.display = 'block';
  if (view === 'lobby') lobbyView.style.display = 'block';
  if (view === 'chat') chatView.style.display = 'block';
  if (view === 'game') gameView.style.display = 'block';
}

// NAVIGATION & AUTH
document.getElementById('go-to-register').onclick = () => {
  showView('register');
  authMessage.textContent = '';
};
document.getElementById('go-to-login').onclick = () => {
  showView('login');
  authMessage.textContent = '';
};

document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  authMessage.textContent = '';
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Falha no login');
    const { user } = await res.json();
    currentUser = user;
    showLobby(user);
  } catch (err) {
    authMessage.textContent = 'Erro no login';
  }
});

document.getElementById('register-form').addEventListener('submit', async e => {
  e.preventDefault();
  authMessage.textContent = '';
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Falha no registro');
    }
    authMessage.style.color = 'green';
    authMessage.textContent = 'Registrado com sucesso! Faça login.';
    showView('login');
  } catch (err) {
    authMessage.style.color = 'red';
    registerMessage.textContent = err.message || 'Erro inesperado no registro';
  }
});

// LOBBY
function showLobby(user) {
  currentUser = user;
  showView('lobby');
  document.getElementById('lobby-username').textContent = user.name;
  connectWebSocket();
}

// RENDERIZA A LISTA DE SALAS PÚBLICAS
function renderRoomList(rooms) {
  publicRoomsList.innerHTML = '';
  if (rooms.length === 0) {
    publicRoomsList.innerHTML = '<p>Não há salas públicas disponíveis no momento.</p>';
    return;
  }

  rooms.forEach(room => {
    const roomItem = document.createElement('div');
    roomItem.className = 'room-item';
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
    alert('Erro: WebSocket não está conectado.');
    return;
  }
  socket.send(JSON.stringify({ type: 'join_room', payload: { roomId } }));
}

// Event listener para salas públicas (usando delegação de eventos)
publicRoomsList.addEventListener('click', e => {
  if (e.target && e.target.classList.contains('join-room-btn')) {
    const roomId = e.target.dataset.roomId;
    joinRoom(roomId);
  }
});

// Event listener para sala privada
function joinPrivateRoom() {
  const roomId = privateRoomCodeInput.value.trim();
  if (roomId) {
    joinRoom(roomId);
    privateRoomCodeInput.value = '';
  } else {
    alert('Por favor, insira o código da sala privada.');
  }
}

joinPrivateRoomBtn.addEventListener('click', joinPrivateRoom);

privateRoomCodeInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    joinPrivateRoom();
  }
});

// --- NOVA LÓGICA DE CRIAÇÃO E SAÍDA DE SALA ---
createRoomBtn.addEventListener('click', () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    alert('Erro: WebSocket não está conectado.');
    return;
  }
  socket.send(JSON.stringify({ type: 'create_room' }));
});

leaveRoomBtn.addEventListener('click', async () => {
  const confirmed = await uiController.showConfirmationModal(
    'Sair da Sala',
    'Você tem certeza que deseja sair da sala e voltar para o lobby?'
  );

  if (confirmed) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      alert('Erro: WebSocket não está conectado.'); // Manter alert aqui é ok para erros inesperados
      return;
    }
    socket.send(JSON.stringify({ type: 'leave_room' }));
    showView('lobby');
    messagesDiv.innerHTML = '';

    socket.send(JSON.stringify({ type: 'get_rooms' }));
  }
});

function updateRoomView(roomData) {
  roomIdDisplay.textContent = roomData.id;
  roomNameDisplay.textContent = roomData.name || 'Sala de Jogo';
  roomPlayersDisplay.textContent = `${roomData.current_users} / ${roomData.max_users}`;
  roomHostDisplay.textContent = roomData.hostName || 'N/D';

  const startGameBtn = document.getElementById('send-game');
  if (currentUser && startGameBtn) {
    if (currentUser.name === roomData.hostName) {
      startGameBtn.style.display = 'block';
    } else {
      startGameBtn.style.display = 'none';
    }
  }
}

function updatePlayerListInLobby(players, hostName) {
  const playerListElement = document.getElementById('player-list-lobby');
  if (!playerListElement) return;

  playerListElement.innerHTML = '';

  players.forEach(player => {
    const li = document.createElement('li');
    li.textContent = player.name;
    if (player.name === hostName) {
      li.classList.add('host');
    }
    playerListElement.appendChild(li);
  });
}

// WebSocket
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const wsUrl = `${protocol}//${host}/ws`;

  socket = new WebSocket(wsUrl);
  socket.onopen = () => {
    console.log('WebSocket Conectado.');
    document.getElementById('send-game').style.display = 'none';
    socket.send(JSON.stringify({ type: 'get_rooms' }));
    timePing('init', socket);
  };

  socket.onmessage = event => {
    try {
      const data = JSON.parse(event.data);
      console.log('Mensagem recebida do WS:', data);

      switch (data.event) {
        case 'room_list':
          renderRoomList(data.rooms);
          break;
        case 'join_success':
          showView('chat');
          appendMessage(`✅ Entrou na sala: ${data.roomName}`);
          break;
        case 'join_error':
          alert(`Erro ao entrar na sala: ${data.message}`);
          break;

        case 'room_info':
          const gameOverModal = document.getElementById('game-over-modal');
          if (gameOverModal && gameOverModal.style.display !== 'none') {
            // O Jogo acabou, vamos voltar para a sala de espera.
            gameModule.hideGameOver(); // 1. Esconde o modal.
            showView('chat'); // 2. Muda a view para a sala de espera.
            gameModule.cleanupGame(); // 3. Limpa os elementos do jogo (tabuleiro, peões, etc).

            messagesDiv.innerHTML = ''; // 4. Limpa o chat explicitamente.
            appendMessage('A partida terminou. Bem-vindo de volta à sala!');
          } else if (lobbyView.style.display === 'block') {
            messagesDiv.innerHTML = ''; // Limpa o chat antes de entrar.
            showView('chat');
            appendMessage(`Bem-vindo à sala!`);
          }
          updateRoomView(data.room);
          updatePlayerListInLobby(data.room.players, data.room.hostName);

          break;

        // EVENTOS DO CHAT
        case 'chat_echo':
          appendMessage(`📝 Você: ${data.message}`);
          break;
        case 'chat_message':
          appendMessage(`💬 ${data.from}: ${data.message}`);
          break;

        // EVENTOS DO JOGO
        case 'game_started':
          console.log('O servidor iniciou o jogo! Mudando para a tela do jogo.');
          showView('game');
          gameModule.initGame(data.payload, socket, currentUser.id);
          break;

        case 'gameStateUpdate':
        case 'game_event':
          if (gameView.style.display === 'block') {
            gameModule.handleServerUpdate(data.payload);
          }
          break;

        case 'game_over':
          if (gameView.style.display === 'block') {
            gameModule.handleGameOver(data.payload);
          }
          break;

        case 'game_ended_by_disconnection':
          gameModule.cleanupGame();
          showView('chat');
          messagesDiv.innerHTML = '';
          appendMessage(
            'O jogo foi encerrado por falta de pessoas e a sala voltou para o modo de espera.'
          );
          break;
        case 'left_game_success':
          gameModule.cleanupGame(); // Limpa os recursos do jogo
          showView('lobby'); // Mostra a tela de lobby
          socket.send(JSON.stringify({ type: 'get_rooms' })); // Pede a lista de salas atualizada
          break;
        // >>>>>>>>>>>> FIM DO NOVO CASE <<<<<<<<<<<<

        case 'game_ended_by_leave':
        case 'game_ended_by_disconnection':
          gameModule.cleanupGame(); // Limpa a tela do jogo
          showView('chat'); // Mostra a tela da sala de espera
          messagesDiv.innerHTML = ''; // Limpa as mensagens antigas
          appendMessage(
            data.payload.message || 'O jogo foi encerrado e a sala voltou ao modo de espera.'
          );
          break;

        case 'game_ended_by_disconnection':
          gameModule.cleanupGame();
          showView('chat');
          messagesDiv.innerHTML = '';
          appendMessage(
            'O jogo foi encerrado por falta de pessoas e a sala voltou para o modo de espera.'
          );
          break;

        // EVENTOS GERAIS
        case 'error':
          appendMessage(`❌ Erro do servidor: ${data.message}`);
          break;
        default:
          console.log('Evento desconhecido recebido: ', data);
      }
    } catch (err) {
      console.error('Erro ao processar mensagem do WebSocket:', err);
      appendMessage('❌ Mensagem inválida recebida: ' + event.data);
    }
  };

  socket.onerror = err => {
    console.error('Erro no WebSocket:', err);
  };
  socket.onclose = () => {
    console.log('🔌 WebSocket desconectado');
    timePing('stop');
    showView('login');
  };
}

// Enviar mensagens (Chat View)
function sendChatMessage() {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    appendMessage('⚠️ WebSocket não conectado');
    return;
  }
  const message = wsInput.value.trim();
  if (!message) return;
  socket.send(JSON.stringify({ type: 'chat', payload: message }));
  wsInput.value = '';
}

sendChatBtn.addEventListener('click', sendChatMessage);

wsInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    sendChatMessage();
  }
});

document.getElementById('send-game').addEventListener('click', () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    appendMessage('⚠️ WebSocket não conectado');
    return;
  }
  socket.send(JSON.stringify({ type: 'start_game' }));
});

// Logout
const logout = async () => {
  if (socket) socket.close();
  timePing('stop');
  gameModule.cleanupGame();

  try {
    await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch { }
  showView('login');
  authMessage.textContent = '';
  authMessage.style.color = 'red';
  messagesDiv.innerHTML = '';
};

document.getElementById('lobby-logout-btn').addEventListener('click', logout);

function appendMessage(msg) {
  const p = document.createElement('p');
  p.textContent = msg;
  messagesDiv.appendChild(p);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function timePing(phase, wss) {
  switch (phase) {
    case 'init':
      pingInterval = setInterval(() => {
        if (wss.readyState === WebSocket.OPEN) {
          wss.send(JSON.stringify({ type: 'ping' }));
          console.log('Ping enviado!');
        }
      }, 20000);
      break;

    case 'stop':
      clearInterval(pingInterval);
      pingInterval = null;
      break;
  }
}
