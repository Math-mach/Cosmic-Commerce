import { activeConnections, ConnectedUser } from "../index";

export function handleChatMessage(user: ConnectedUser, message: string) {
    console.log(`💬 Mensagem do ${user.email}: ${message}`);

    const broadcastData = {
        event: "chat_message",
        from: user.email,
        message,
    };

    const json = JSON.stringify(broadcastData);

    activeConnections.forEach((u) => {
        if (u.ws.readyState === WebSocket.OPEN) {
            u.ws.send(json);
        }
    });
}
