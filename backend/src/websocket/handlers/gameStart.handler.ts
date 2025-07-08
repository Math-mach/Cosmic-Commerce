import { ConnectedUser, activeConnections } from "../index";

export function handleGameStart(user: ConnectedUser) {
    console.log(`🎮 Usuário ${user.email} iniciou o jogo.`);

    const message = {
        event: "game_start",
        message: `🎮 ${user.email} abriu uma sala de jogo!`,
    };

    const json = JSON.stringify(message);

    activeConnections.forEach((u) => {
        if (u.ws.readyState === u.ws.OPEN) {
            u.ws.send(json);
        }
    });
}
