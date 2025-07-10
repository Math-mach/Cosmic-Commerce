import { Room } from './Room';
import { v4 as uuidv4 } from 'uuid';
import { ConnectedUser, activeConnections } from '../index';

class RoomManager {
  private rooms: Map<string, Room>;

  constructor() {
    this.rooms = new Map();
  }

  createRoom(creatorName: string): Room {
    const roomId = uuidv4().substring(0, 8);
    const roomName = `Sala de ${creatorName} - ${roomId}`;
    const newRoom = new Room(roomId, roomName);
    this.rooms.set(roomId, newRoom);
    console.log(`Sala ${roomName} (${roomId}) criada.`);
    return newRoom;
  }

  findRoomById(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  removeRoom(roomId: string) {
    this.rooms.delete(roomId);
    console.log(`Sala ${roomId} removida.`);
  }

  getPublicRooms() {
    const publicRoomsData = [];
    for (const room of this.rooms.values()) {
      if (room.isPublic && room.state === 'waiting') {
        publicRoomsData.push({
          id: room.id,
          name: room.name,
          current_users: room.players.size,
          max_users: room.maxPlayers,
        });
      }
    }
    return publicRoomsData;
  }

  broadcastToRoom(roomId: string, message: string) {
    const room = this.findRoomById(roomId);
    if (room) {
      for (const player of room.getPlayers()) {
        player.ws.send(message);
      }
    }
  }

  sendToUser(userId: string, payload: object) {
    for (const user of activeConnections) {
      if (user.id === userId) {
        user.ws.send(JSON.stringify(payload));
        return;
      }
    }
  }
}

export function broadcastRoomListUpdateToLobby(activeConnections: Set<ConnectedUser>) {
  const publicRooms = roomManager.getPublicRooms();
  const roomListPayload = {
    event: 'room_list',
    rooms: publicRooms,
  };
  const message = JSON.stringify(roomListPayload);

  for (const connection of activeConnections) {
    if (connection.roomId === null) {
      connection.ws.send(message);
    }
  }
}

export const roomManager = new RoomManager();
