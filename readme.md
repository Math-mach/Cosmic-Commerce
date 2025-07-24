# 🚀 Cosmic Commerce

**Cosmic Commerce** é um jogo de tabuleiro multiplayer online para 3 a 4 jogadores, onde estratégia, sorte e um pouco de caos se encontram. Navegue pela vastidão da "Nebulosa Espiral", um mapa dinâmico cheio de oportunidades e perigos. O seu objetivo é simples: coletar moedas, comprar itens poderosos e, acima de tudo, juntar **Fragmentos de Estrela** para se tornar a maior lenda do comércio cósmico!

---

## ✨ Funcionalidades

-   **Multiplayer em Tempo Real:** Jogue com 3 ou 4 amigos em tempo real com comunicação via WebSockets.
-   **Sistema de Autenticação e Usuário:** Crie sua conta, faça login e mantenha seu progresso.
-   **Lobby de Salas:** Crie salas de jogo públicas ou privadas para jogar com quem você quiser.
-   **Chat Integrado:** Comunique-se com outros jogadores na sala de espera.
-   **Tabuleiro Interativo:** Explore um mapa complexo com diferentes tipos de casas (moedas, eventos, lojas, catástrofes).
-   **Sistema de Itens:** Utilize itens para ganhar vantagens ou prejudicar seus oponentes.
-   **Pontuação e Prêmios:** A vitória é definida por Pontos de Vitória, incluindo bônus por desempenho.
-   **Gestão de Desconexão:** Sistema robusto que permite que jogadores se reconectem ou sejam removidos por votação.

---

## 🛠️ Tecnologias Utilizadas

-   **Backend:** Node.js, Express, TypeScript, WebSockets, PostgreSQL, Knex.js, JWT.
-   **Frontend:** JavaScript (Vanilla, ES Modules), HTML5, CSS3.
-   **Infraestrutura:** Docker, Docker Compose, Nginx.

---

## 🏁 Quick Start: Rodando o Projeto com Docker

Esta é a maneira **recomendada** para rodar a aplicação completa (Frontend, Backend e Banco de Dados) com um único comando.

### Pré-requisitos

-   [Docker](https://docs.docker.com/get-docker/) instalado.
-   [Docker Compose](https://docs.docker.com/compose/install/) instalado.

### Passos para Instalação

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/seu-usuario/Cosmic-Commerce.git
    cd Cosmic-Commerce
    ```

2.  **Configure as Variáveis de Ambiente:**
    Crie os arquivos `.env` necessários a partir dos exemplos fornecidos.

    -   **Para o Backend:** Copie `backend/.env.example` para `backend/.env` e preencha os valores.
        ```bash
        cp backend/.env.example backend/.env
        ```
    -   **Para o Banco de Dados:** Copie `postgres/.env.example` para `postgres/.env`.
        ```bash
        cp postgres/.env.example postgres/.env
        ```
> **Importante:** As credenciais do banco de dados no arquivo `postgres/.env` devem ser as mesmas que você colocou em `backend/.env`.

3.  **Inicie os Contêineres:**
    Na raiz do projeto, execute o comando:
    ```bash
    docker-compose up -d --build
    ```
    Este comando irá construir as imagens, baixar as dependências e iniciar todos os serviços (Nginx, Node.js, PostgreSQL) em segundo plano.

4.  **Acesse a Aplicação:**
    -   **Localmente:** Abra seu navegador e acesse `http://localhost`.
    -   **Em Produção:** Se configurado com um domínio, acesse `https://seu-dominio.com`.

---

## 📖 Para Desenvolvedores

Quer entender a fundo a arquitetura ou contribuir para uma parte específica do projeto?

-   Para detalhes sobre a API, WebSockets e a lógica do jogo, consulte o **[README do Backend](./backend/README.md)**.
-   Para informações sobre a estrutura da UI e a manipulação do DOM, veja o **[README do Frontend](./frontend/README.md)**.

## 📜 Licença

Este projeto está licenciado sob a Licença ISC. Veja o arquivo `package.json` para mais detalhes.