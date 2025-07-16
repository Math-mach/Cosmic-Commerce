# 🌌 Cosmic Commerce

Bem-vindo ao **Cosmic Commerce**, um jogo de tabuleiro multiplayer online em tempo real, onde estratégia, sorte e um toque de caos se encontram no espaço sideral!  
Inspirado em clássicos como **Mario Party**, o objetivo é coletar moedas, comprar itens, e se tornar o maior magnata do universo.

---

## 📋 Tabela de Conteúdos

-   [📜 Visão Geral das Regras](#-visão-geral-das-regras)
-   [🛠️ Tecnologias Utilizadas](#️-tecnologias-utilizadas)
-   [📦 Como Instalar e Rodar (com Docker)](#-como-instalar-e-rodar-com-docker)
-   [📂 Estrutura do Projeto](#-estrutura-do-projeto)
-   [🌐 Rotas da API](#-rotas-da-api)
-   [🔌 Eventos WebSocket](#-eventos-websocket)

---

## 📜 Visão Geral das Regras

As regras completas estão detalhadas no arquivo `DefinicaoDoJogo.json`, mas aqui está um resumo:

-   **Jogadores:** 2 a 4
-   **Duração:** 20 turnos
-   **Objetivo:** Acumular o maior número de **Pontos de Vitória**

### 🏆 Pontuação Final:

-   1 ponto por cada **Fragmento de Estrela** obtida

### 🎲 Fluxo de Turno:

1. Jogador rola o dado
2. Move-se pelo tabuleiro
3. Ativa o efeito da casa onde parou

### 🪐 Tipos de Casas:

-   **Azul:** +3 moedas
-   **Vermelha:** -3 moedas
-   **Verde (?):** Evento aleatório
-   **Amarela (Loja):** Compra de itens

---

## 🛠️ Tecnologias Utilizadas

### 🔧 Backend

-   **Node.js** + **TypeScript**
-   **Express.js**
-   **WebSockets (ws)**
-   **PostgreSQL** com **Knex.js**
-   **JWT** + Cookies httpOnly

### 🎨 Frontend

-   HTML5, CSS3, JS (ES6 Modules)
-   SPA simulada (sem frameworks)

### 🐳 Infraestrutura

-   Docker & Docker Compose
-   Nginx (Proxy Reverso)

---

## 📦 Como Instalar e Rodar (com Docker)

### ✅ Pré-requisitos:

-   Docker
-   Docker Compose

### 1️⃣ Clonar o repositório:

```bash
git clone <URL_DO_SEU_REPOSITORIO>
cd <NOME_DA_PASTA_DO_PROJETO>
```

### 2️⃣ Configurar variáveis de ambiente:

#### 2a. Backend (`backend/.env`):

```bash
cd backend
cp .env.example .env  # ou use 'copy' no Windows
```

Exemplo de conteúdo:

```env
NODE_ENV=development
JWT_SECRET=sua-chave-secreta
PORT=7000

DB_USER=admin
DB_PASSWORD=admin
DB_PORT=5432
DB_NAME=cosmicdb
```

#### 2b. Banco de Dados (`postgres/.env`):

Crie um arquivo `.env` na pasta `postgres` com o seguinte conteúdo:

```env
POSTGRESQL_USERNAME=admin
POSTGRESQL_PASSWORD=admin
POSTGRESQL_DATABASE=cosmicdb
```

> Os valores devem ser os mesmos configurados no `docker-compose.yml`.

### 3️⃣ Rodar a aplicação:

Na raiz do projeto:

```bash
docker-compose up -d --build
```

### 4️⃣ Acessar no navegador:

```
http://localhost:8080
```

### ⏹️ Parar os containers:

```bash
docker-compose down
```

---

## 📂 Estrutura do Projeto

```bash
.
├── backend/
│   ├── src/
│   │   ├── controller/
│   │   ├── db/
│   │   ├── middleware/
│   │   ├── repository/
│   │   ├── service/
│   │   └── websocket/
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── game/
│   ├── app.js
│   ├── index.html
│   ├── style.css
│   └── nginx.conf
│
├── postgres/
│   └── .env
│
└── docker-compose.yml
```

---

## 🌐 Rotas da API

Prefixadas com `/api`.

| Método | Rota           | Descrição                    | Autenticação |
| ------ | -------------- | ---------------------------- | ------------ |
| POST   | /user/register | Registro de novo usuário     | ❌           |
| POST   | /user/login    | Login + cookie httpOnly      | ❌           |
| POST   | /user/logout   | Logout e remoção de cookie   | ✅           |
| GET    | /user/me       | Dados do usuário autenticado | ✅           |

---

## 🔌 Eventos WebSocket

### 🔽 Cliente → Servidor

-   `get_rooms`: Pede lista de salas públicas
-   `create_room`: Cria uma nova sala
-   `join_room`: Entra numa sala
-   `leave_room`: Sai da sala
-   `chat`: Envia mensagem no chat
-   `start_game`: Inicia o jogo (somente dono)
-   `player_action`: Envia ação do jogador (dado, movimento etc.)

### 🔼 Servidor → Cliente

-   `room_list`: Envia lista de salas públicas
-   `join_success`: Confirmação de entrada na sala
-   `room_info`: Atualizações da sala (ex: novo jogador)
-   `chat_message`: Mensagem do chat recebida
-   `game_started`: Jogo iniciado + estado inicial
-   `gameStateUpdate`: Estado completo do jogo atualizado
-   `game_event`: Evento específico (animação, efeitos etc.)

---

## 🚀 Pronto para Jogar?

Abra seu navegador em `http://localhost:8080`, crie uma conta, entre numa sala com amigos e divirta-se!