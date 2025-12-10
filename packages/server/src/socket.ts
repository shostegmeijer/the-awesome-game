import { ClientToServerEvents, CursorData, ServerToClientEvents } from '@awesome-game/shared';
import { Server, Socket } from 'socket.io';
import { BotSystem } from './bots.js';
import { BulletSystem } from './bullets.js';
import { ADMIN_PASSWORD } from './index.js';
import { LaserSystem } from './lasers.js';
import { MineSystem } from './mines.js';
import { PowerUpSystem } from './powerups.js';
import { addBot, addUser, getAllBots, getAllUsers, getSettings, removeBot, removeUser, setBotHealth, updateCursor, updateHealth, updateSettings } from './state.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/**
 * Initialize Socket.io event handlers
 */
export function initializeSocketHandlers(io: TypedServer): void {
  // Centralized death handler (from merged development)
  const handleDeath = (userId: string) => {
    const RESPAWN_DELAY = 10000;
    const respawnTime = Date.now() + RESPAWN_DELAY;

    // Notify all users about respawn (so everyone knows)
    io.emit('player:respawn', {
      userId,
      x: 0,
      y: 0,
      respawnTime
    });

    setTimeout(() => {
      const user = getAllUsers().get(userId);
      if (user) {
        // Reset user state
        user.health = 100;
        user.x = Math.random() * 2000;
        user.y = Math.random() * 2000;
        user.weaponType = 'machineGun';

        // Notify all clients about respawn (health update + position update)
        io.emit('health:update', {
          userId,
          health: 100
        });

        // Force position update
        io.emit('cursor:update', {
          userId,
          x: user.x,
          y: user.y,
          rotation: 0,
          color: user.color,
          label: user.label,
          health: user.health,
          type: 'player',
        });
      }
    }, RESPAWN_DELAY);
  };

  // Initialize game systems
  const mineSystem = new MineSystem(io, handleDeath);
  const powerUpSystem = new PowerUpSystem(io);
  const bulletSystem = new BulletSystem();
  const botSystem = new BotSystem(io, bulletSystem);
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

      // Player respawn timing handled by handleDeath
    });

    // Check bullet collisions with mines, users, and bots
    bulletSystem.getBullets().forEach(bullet => {
      // Mines
      const hitMineId = mineSystem.checkBulletCollision(bullet.x, bullet.y);
      if (hitMineId) {
        mineSystem.explodeMine(hitMineId, bullet.userId);
        bulletSystem.removeBullet(bullet.id);
        return;
      }

      // Users
      const USER_RADIUS = 25;
      const usersMap = getAllUsers();
      for (const user of usersMap.values()) {
        const dx = bullet.x - user.x;
        const dy = bullet.y - user.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 <= USER_RADIUS * USER_RADIUS) {
          bulletSystem.removeBullet(bullet.id);
          const newHealth = updateHealth(user.id, Math.max(0, user.health - 10));
          if (newHealth !== null) {
            io.emit('health:update', { userId: user.id, health: newHealth });
            if (newHealth === 0) {
              handleDeath(user.id);
            }
          }
          return;
        }
      }

      // Bots
      const BOT_RADIUS = 25;
      const bots = getAllBots();
      for (const bot of bots) {
        const dx = bullet.x - bot.x;
        const dy = bullet.y - bot.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 <= BOT_RADIUS * BOT_RADIUS) {
          bulletSystem.removeBullet(bullet.id);
          const newHealth = Math.max(0, bot.health - 10);
          setBotHealth(bot.id, newHealth);
          io.emit('health:update', { userId: bot.id, health: newHealth });
          return;
        }
      }
    });
  }, 16); // 16ms = ~60 updates per second

  io.on('connection', (socket: TypedSocket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    // Add user to state
    addUser(socket.id);
    // Apply starting health from settings
    const s = getSettings();
    updateHealth(socket.id, s.playerStartingHealth);

    // Notify other clients about the new user (skipped; cursors:sync will reflect state)

    // Send current users (excluding self) to the new client
    const cursors: Record<string, CursorData> = {};
    getAllUsers().forEach((u, id) => {
      if (id !== socket.id) {
        cursors[id] = {
          x: u.x,
          y: u.y,
          rotation: u.rotation,
          color: u.color,
          label: u.label,
          health: u.health,
          type: 'player',
          activeWeapon: (u as any).weaponType,
        };
      }
    });
    // Include bots in initial cursors sync
    getAllBots().forEach(bot => {
      cursors[bot.id] = {
        x: bot.x,
        y: bot.y,
        rotation: 0,
        color: '#FF00FF',
        label: bot.label,
        health: bot.health,
        type: 'bot',
      };
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
        rotation: rotation || 0,
        color: getAllUsers().get(socket.id)?.color || '#ffffff',
        label: getAllUsers().get(socket.id)?.label || 'Player',
        health: getAllUsers().get(socket.id)?.health || 100,
        type: 'player',
        activeWeapon: getAllUsers().get(socket.id)?.weaponType as any,
      });
    });

    // Handle bullet shooting
    socket.on('bullet:shoot', ({ x, y, angle, isRocket }) => {
      const user = getAllUsers().get(socket.id);
      if (!user || user.health <= 0) return;

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
        color: user.color,
        isRocket
      });
    });

    // Handle laser shooting
    socket.on('laser:shoot', ({ angle }) => {
      const user = getAllUsers().get(socket.id);
      if (!user || user.health <= 0) return;

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

        // Check for death and schedule respawn
        if (newHealth <= 0) {
          handleDeath(userId);
        }
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.id}`);
      removeUser(socket.id);
      io.emit('user:left', { userId: socket.id });
    });
  });

  function isAuthorized(token?: string): boolean {
    return !!token && token === ADMIN_PASSWORD;
  }

  io.on('connection', (socket) => {
    socket.on('admin:login', ({ password }: { password: string }) => {
      if (password === ADMIN_PASSWORD) {
        socket.emit('admin:login:ok', { token: ADMIN_PASSWORD });
      } else {
        socket.emit('admin:login:error', { error: 'Invalid password' });
      }
    });

    socket.on('admin:getPlayers', ({ token }: { token: string }) => {
      if (!isAuthorized(token)) return socket.emit('admin:error', { error: 'Unauthorized' });
      const players = Array.from(getAllUsers().values()).map(u => ({
        id: u.id,
        label: u.label,
        x: u.x,
        y: u.y,
        health: u.health,
        points: u.points
      }));
      socket.emit('admin:players', { players });
    });

    socket.on('admin:getBots', ({ token }: { token: string }) => {
      if (!isAuthorized(token)) return socket.emit('admin:error', { error: 'Unauthorized' });
      socket.emit('admin:bots', { bots: getAllBots() });
    });

    socket.on('admin:addBot', ({ token }: { token: string }) => {
      if (!isAuthorized(token)) return socket.emit('admin:error', { error: 'Unauthorized' });
      const bot = addBot(getSettings().botHealth);
      // Also increase desired botCount so the maintenance loop keeps it
      const s = getSettings();
      updateSettings({ botCount: s.botCount + 1 });
      socket.emit('admin:bots', { bots: getAllBots() });
      socket.emit('admin:addBot:ok', { bot });
    });

    socket.on('admin:removeBot', ({ token, id }: { token: string, id: string }) => {
      if (!isAuthorized(token)) return socket.emit('admin:error', { error: 'Unauthorized' });
      const ok = removeBot(id);
      if (!ok) return socket.emit('admin:removeBot:error', { error: 'bot not found', id });
      // Also decrease desired botCount
      const s = getSettings();
      updateSettings({ botCount: Math.max(0, s.botCount - 1) });
      socket.emit('admin:bots', { bots: getAllBots() });
      socket.emit('admin:removeBot:ok', { removed: id });
    });

    // Settings get/set
    socket.on('admin:getSettings', ({ token }: { token: string }) => {
      if (!isAuthorized(token)) return socket.emit('admin:error', { error: 'Unauthorized' });
      socket.emit('admin:settings', getSettings());
    });
    socket.on('admin:updateSettings', ({ token, settings }: { token: string, settings: Partial<ReturnType<typeof getSettings>> }) => {
      if (!isAuthorized(token)) return socket.emit('admin:error', { error: 'Unauthorized' });
      const updated = updateSettings(settings);
      socket.emit('admin:settings', updated);
    });
  });

  // Start bots system and periodically refresh admin bots table
  botSystem.start();
  setInterval(() => {
    io.emit('admin:bots', { bots: getAllBots() });
  }, 500);
}
