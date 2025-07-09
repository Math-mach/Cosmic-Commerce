import { ConnectedUser } from "../index";

import { roomManager } from "../managers/roomManager";

export function handleGetRooms(user: ConnectedUser) {
    const publicRooms = roomManager.getPublicRooms();

    const response = {
        event: "room_list",
        rooms: publicRooms,
    };

    user.ws.send(JSON.stringify(response));
}
