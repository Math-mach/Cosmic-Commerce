document.addEventListener("DOMContentLoaded", () => {
    const handleEnterButtonClick = (event) => {
        console.log(
            "Botão 'Entrar no Jogo' clicado. Redirecionando para index.html..."
        );
    };

    const enterButton1 = document.getElementById("enter-game-btn");
    const enterButton2 = document.getElementById("enter-game-btn-2");

    if (enterButton1) {
        enterButton1.addEventListener("click", handleEnterButtonClick);
    }

    if (enterButton2) {
        enterButton2.addEventListener("click", handleEnterButtonClick);
    }
});
