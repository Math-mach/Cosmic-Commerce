# 🚀 Cosmic Commerce - Frontend

Bem-vindo ao frontend do Cosmic Commerce! Esta parte do projeto é responsável por toda a interface do usuário, desde o login e lobby até o tabuleiro de jogo interativo. Foi construído com **HTML, CSS e JavaScript puros (Vanilla JS)**, utilizando uma arquitetura modular para organizar a lógica do jogo e a manipulação da UI.

## ✨ Funcionalidades da Interface

-   **Renderização Dinâmica:** A interface se adapta para mostrar a visão correta (Login, Lobby, Sala de Espera ou Jogo) com base no estado atual do usuário.
-   **Tabuleiro Interativo:** O tabuleiro é construído dinamicamente com CSS Grid, permitindo a fácil manipulação de casas, peões e outros elementos visuais.
-   **Componentes Reativos:**
    -   **Painéis de Jogadores:** Exibem informações em tempo real sobre moedas, fragmentos, itens e efeitos ativos de cada jogador.
    -   **Painel de Turno:** Mostra o jogador da vez, o resultado do dado e o botão de ação principal.
    -   **Modais:** Janelas pop-up para interações cruciais como Lojas, Catástrofes, Seleção de Alvo, e tela de Fim de Jogo.
-   **Comunicação em Tempo Real:** Conecta-se ao servidor backend via WebSocket para receber atualizações de estado e enviar ações do jogador.

## 📂 Estrutura dos Arquivos

A lógica do frontend está organizada de forma modular para facilitar a manutenção.

-   `index.html`: A página principal da aplicação, que contém a estrutura de todas as "views" e modais.
-   `landing.html`: A página de apresentação do jogo.
-   `app.js`: O ponto de entrada principal. Gerencia a conexão WebSocket, o roteamento entre as views (login, lobby, jogo) e despacha os eventos recebidos do servidor.
-   `/css`: Contém todos os arquivos de estilização.
    -   `main.css`: Importa todos os outros arquivos CSS.
    -   `game.css`, `lobby.css`, `room.css`, `modals.css`, `auth.css`: Estilos específicos para cada parte da aplicação.
-   `/game`: O coração da lógica do lado do cliente.
    -   `game.js`: Orquestra o início do jogo, manipula as atualizações do servidor (`gameStateUpdate`, `game_event`) e gerencia os listeners de eventos do jogo.
    -   `game-state.js`: Mantém o estado atual do jogo no cliente (jogadores, turno, etc.).
    -   `ui-controller.js`: Centraliza toda a manipulação do DOM. Atualiza os painéis, abre/fecha modais e exibe notificações.
    -   `map-controller.js`: Responsável por desenhar o tabuleiro, os peões e qualquer outro elemento visual sobre o mapa.
    -   `game-data.js`: Contém as definições estáticas do jogo (mapa, itens, eventos), espelhando o arquivo do backend para evitar requisições desnecessárias.
-   `/assets`: Contém todas as imagens e ícones usados na interface.

## 🚀 Como Executar

O frontend foi projetado para ser servido pelo **Nginx** dentro de um contêiner Docker, que também atua como um proxy reverso para as requisições de API e WebSocket para o backend.

A forma recomendada de executar o frontend é através do `docker-compose.yml` na raiz do projeto.

Para mais detalhes, consulte o **[README principal do projeto](../README.md)**.

### Executando em Desenvolvimento (Alternativo)

Se você desejar fazer alterações rápidas no frontend sem reconstruir a imagem Docker, você pode usar uma extensão como o **Live Server** no VS Code.

1.  Instale a extensão "Live Server".
2.  Clique com o botão direito no arquivo `index.html` e selecione "Open with Live Server".

**Atenção:** Ao usar este método, as chamadas para a API (`/api/...`) e a conexão WebSocket (`/ws`) não funcionarão, pois o proxy reverso do Nginx não estará ativo. Esta abordagem é útil apenas para ajustes visuais de UI que não dependem da comunicação com o backend.