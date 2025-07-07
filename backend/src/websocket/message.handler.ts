import { ConnectedUser } from "./index";
import { handleGameStart, handleChatMessage } from "./handlers";

export function handleClientMessage(user: ConnectedUser, rawMessage: string) {
    try {
        const data = JSON.parse(rawMessage);

        switch (data.type) {
            case "chat":
                handleChatMessage(user, data.payload);
                break;

            case "game_start":
                handleGameStart(user);
                break;

            default:
                user.ws.send(
                    JSON.stringify({
                        event: "error",
                        message: `Tipo de mensagem desconhecido: ${data.type}`,
                    })
                );
        }
    } catch (err) {
        console.error("Erro ao processar mensagem:", err);
        user.ws.send(
            JSON.stringify({ event: "error", message: "Mensagem inválida" })
        );
    }
}
