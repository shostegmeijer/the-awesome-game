import { Server, Socket } from 'socket.io';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  CursorData
} from '@awesome-game/shared';
import { addUser, removeUser, updateCursor, getAllUsers, updateHealth } from './state.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/**
 * Initialize Socket.io event handlers
 */
export function initializeSocketHandlers(io: TypedServer): void {
  io.on('connection', (socket: TypedSocket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    // Add user to state
    const user = addUser(socket.id);

    // Notify other clients about the new user
    socket.broadcast.emit('user:joined', {
      userId: user.id,
      color: user.color,
      label: user.label
    });

    // Send current users to the new client
    const cursors: Record<string, CursorData> = {};
    getAllUsers().forEach((u, id) => {
      if (id !== socket.id) {
        cursors[id] = {
          x: u.x,
          y: u.y,
          color: u.color,
          label: u.label,
          health: u.health
        };
      }
    });
    socket.emit('cursors:sync', { cursors });

    // Handle cursor movement (volatile for performance)
    socket.on('cursor:move', ({ x, y }) => {
      // Validate coordinates
      if (typeof x !== 'number' || typeof y !== 'number') return;
      if (x < 0 || y < 0 || x > 10000 || y > 10000) return;

      // Update state
      updateCursor(socket.id, x, y);

      // Broadcast to other clients (volatile = UDP-like, prioritize speed over reliability)
      socket.volatile.broadcast.emit('cursor:update', {
        userId: socket.id,
        x,
        y
      });
    });

    // Handle bullet shooting
    socket.on('bullet:shoot', ({ x, y, angle }) => {
      const user = getAllUsers().get(socket.id);
      if (!user) return;

      // Generate unique bullet ID
      const bulletId = `${socket.id}-${Date.now()}-${Math.random()}`;

      // Calculate velocity from angle
      const bulletSpeed = 15;
      const vx = Math.cos(angle) * bulletSpeed;
      const vy = Math.sin(angle) * bulletSpeed;

      // Broadcast bullet to ALL clients (including sender)
      io.emit('bullet:spawn', {
        bulletId,
        userId: socket.id,
        x,
        y,
        vx,
        vy,
        color: user.color
      });
    });

    // Handle health damage
    socket.on('health:damage', ({ userId, health }) => {
      const newHealth = updateHealth(userId, health);
      if (newHealth !== null) {
        // Broadcast health update to all clients
        io.emit('health:update', {
          userId,
          health: newHealth
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.id}`);
      removeUser(socket.id);
      io.emit('user:left', { userId: socket.id });
    });
  });
}
