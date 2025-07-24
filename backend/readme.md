# 🚀 Cosmic Commerce - Backend

Este é o backend do projeto Cosmic Commerce. Desenvolvido com **Node.js, Express e TypeScript**, ele serve como a espinha dorsal de toda a aplicação, gerenciando a lógica do jogo, a autenticação de usuários e a comunicação em tempo real via WebSockets.

## ✨ Funcionalidades

-   **API REST para Usuários:** Endpoints seguros para registro, login e gerenciamento de perfis de usuário.
-   **Autenticação Segura:** Utiliza JSON Web Tokens (JWT) armazenados em cookies `HttpOnly` para proteger as rotas e a conexão WebSocket.
-   **Servidor WebSocket:** Gerencia o estado das partidas em tempo real, garantindo que todos os jogadores estejam sincronizados.
-   **Gerenciamento de Salas:** Um `RoomManager` robusto permite a criação e o gerenciamento de salas de jogo públicas e privadas.
-   **Motor de Jogo:** Toda a lógica de turnos, movimento no tabuleiro, efeitos de casas, uso de itens e condições de vitória é processada no servidor.
-   **Persistência de Dados:** As informações dos usuários são salvas em um banco de dados **PostgreSQL**.
-   **Tratamento de Desconexão:** Um sistema inteligente lida com jogadores que perdem a conexão, permitindo que eles se reconectem a uma partida em andamento ou que sejam removidos por inatividade ou votação.

## 🛠️ Tecnologias Utilizadas

-   **Linguagem:** TypeScript
-   **Ambiente:** Node.js
-   **Framework:** Express.js
-   **WebSockets:** `ws` library
-   **Banco de Dados:** PostgreSQL
-   **ORM/Query Builder:** Knex.js
-   **Autenticação:** `jsonwebtoken`, `bcrypt`
-   **Validação de Tipos:** Tipos customizados e `ts-node-dev` para desenvolvimento.

## 🔌 API Endpoints

Todos os endpoints estão sob o prefixo `/api`.

-   `POST /user/register` - Registra um novo usuário.
-   `POST /user/login` - Autentica um usuário e retorna um cookie com o token JWT.
-   `POST /user/logout` - Invalida o cookie de autenticação do usuário.
-   `GET /user/me` - Retorna as informações do usuário autenticado (requer token).

## 💬 Arquitetura WebSocket

A comunicação em tempo real é o coração do jogo e é gerenciada por uma arquitetura modular:

-   **`message.handler.ts`**: Ponto de entrada para todas as mensagens recebidas de um cliente. Analisa o tipo de mensagem e a encaminha para o manipulador correto.
-   **`/handlers`**: Contém a lógica específica para cada tipo de ação do cliente (ex: `chat.handler.ts`, `joinRoom.handler.ts`, `playerAction.handler.ts`).
-   **`/managers`**: Classes que gerenciam o estado global.
    -   `RoomManager`: Cria, localiza e remove salas de jogo.
    -   `Room`: Uma classe que encapsula o estado completo de uma única partida, incluindo `gameState`, jogadores, etc.
-   **`gameState`**: Um objeto JSON que representa o "estado vivo" de uma partida, constantemente atualizado e sincronizado com os clientes.

## 🚀 Como Executar

### Método 1: Usando Docker (Recomendado)

A forma mais simples de rodar o backend, juntamente com o banco de dados e o frontend, é utilizando o Docker Compose.

**Para instruções detalhadas, consulte o [README principal do projeto](../README.md).**

### Método 2: Execução Local (para Desenvolvimento)

Se você preferir rodar o servidor localmente sem Docker, siga os passos abaixo.

#### Pré-requisitos

-   Node.js (v18 ou superior)
-   npm (geralmente instalado com o Node.js)
-   Uma instância do PostgreSQL rodando localmente ou em um servidor acessível.

#### Passos para Instalação

1.  **Navegue até a pasta do backend:**
    ```bash
    cd backend
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configure o Banco de Dados:**
    -   Crie um banco de dados no seu servidor PostgreSQL.
    -   Execute o script SQL encontrado em `/postgres/init.sql` para criar a tabela de usuários.

4.  **Configure as Variáveis de Ambiente:**
    -   Crie uma cópia do arquivo `.env.example` e renomeie-a para `.env`.
    -   Edite o arquivo `.env` com suas configurações:
        ```env
        # Ambiente (geralmente 'development' para rodar local)
        NODE_ENV=development

        # Crie uma chave secreta longa e aleatória
        JWT_SECRET=sua_chave_secreta_super_segura

        # Porta para o servidor Express
        PORT=7000

        # Credenciais do seu banco de dados PostgreSQL
        DB_USER=seu_usuario_do_banco
        DB_PASSWORD=sua_senha_do_banco
        DB_PORT=5432
        DB_NAME=o_nome_do_seu_banco
        ```

5.  **Inicie o Servidor:**

    -   **Para desenvolvimento (com recarga automática):**
        ```bash
        npm run dev
        ```
        O servidor irá reiniciar automaticamente a cada alteração nos arquivos `.ts`.

    -   **Para produção (compilado):**
        Primeiro, compile os arquivos TypeScript para JavaScript:
        ```bash
        npm run build
        ```
        Depois, inicie o servidor:
        ```bash
        npm start
        ```

O servidor backend estará rodando em `http://localhost:7000`.