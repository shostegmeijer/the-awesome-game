import { Server, Socket } from 'socket.io';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  CursorData
} from '@awesome-game/shared';
import { addUser, removeUser, updateCursor, getAllUsers, updateHealth } from './state.js';
import { MineSystem } from './mines.js';
import { PowerUpSystem } from './powerups.js';
import { BulletSystem } from './bullets.js';
import { LaserSystem } from './lasers.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/**
 * Initialize Socket.io event handlers
 */
export function initializeSocketHandlers(io: TypedServer): void {
  // Initialize game systems
  const mineSystem = new MineSystem(io);
  const powerUpSystem = new PowerUpSystem(io);
  const bulletSystem = new BulletSystem();
  const laserSystem = new LaserSystem(mineSystem);

  // Start server-side game loop (60 TPS)
  setInterval(() => {
    mineSystem.update();
    powerUpSystem.update();
    bulletSystem.update();
    laserSystem.update();

    // Check collisions
    const users = getAllUsers();

    // Check powerup collection
    users.forEach(user => {
      const collectedPowerUp = powerUpSystem.checkCollection(user.x, user.y, user.radius);
      if (collectedPowerUp) {
        powerUpSystem.collectPowerUp(collectedPowerUp.id, user.id);
      }

      // Check mine collision with player
      const hitMineId = mineSystem.checkPlayerCollision(user.x, user.y, user.radius);
      if (hitMineId) {
        mineSystem.explodeMine(hitMineId, user.id);
      }
    });

    // Check bullet collisions with mines
    bulletSystem.getBullets().forEach(bullet => {
      const hitMineId = mineSystem.checkBulletCollision(bullet.x, bullet.y);
      if (hitMineId) {
        mineSystem.explodeMine(hitMineId, bullet.userId);
        bulletSystem.removeBullet(bullet.id);
      }
    });

  }, 16); // 16ms = ~60 updates per second

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
          rotation: u.rotation,
          color: u.color,
          label: u.label,
          health: u.health
        };
      }
    });
    socket.emit('cursors:sync', { cursors });

    // Sync game state
    socket.emit('mine:sync', { mines: mineSystem.getMines() });
    socket.emit('powerup:sync', { powerups: powerUpSystem.getPowerUps() });

    // Handle cursor movement (volatile for performance)
    socket.on('cursor:move', ({ x, y, rotation }) => {
      // Validate coordinates
      if (typeof x !== 'number' || typeof y !== 'number') return;
      if (x < 0 || y < 0 || x > 10000 || y > 10000) return;

      // Update state
      updateCursor(socket.id, x, y, rotation || 0);

      // Broadcast to other clients (volatile = UDP-like, prioritize speed over reliability)
      socket.volatile.broadcast.emit('cursor:update', {
        userId: socket.id,
        x,
        y,
        rotation: rotation || 0
      });
    });

    // Handle bullet shooting
    socket.on('bullet:shoot', ({ x, y, angle }) => {
      const user = getAllUsers().get(socket.id);
      if (!user) return;

      // Generate unique bullet ID
      const bulletId = `${socket.id}-${Date.now()}-${Math.random()}`;

      // Add to server tracking
      bulletSystem.addBullet(bulletId, socket.id, x, y, angle);

      // Calculate velocity from angle (for client prediction)
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

    // Handle laser shooting
    socket.on('laser:shoot', ({ x, y, angle }) => {
      const user = getAllUsers().get(socket.id);
      if (!user) return;

      // Add to server tracking for continuous collision
      laserSystem.addLaser(socket.id, angle);
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
