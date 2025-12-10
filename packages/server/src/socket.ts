
import {
  ClientToServerEvents,
  CursorData,
  MAP_HEIGHT,
  MAP_WIDTH,
  ServerToClientEvents
} from '@awesome-game/shared';
import { Server, Socket } from 'socket.io';
import { BotSystem } from './bots.js';
import { BulletSystem } from './bullets.js';
import { calculatePlacementScore, getPlayerName, submitScoreToHub } from './hub-api.js';
import { ADMIN_PASSWORD } from './index.js';
import { LaserSystem } from './lasers.js';
import { MineSystem } from './mines.js';
import { PowerUpSystem } from './powerups.js';
import { addBot, addDeath, addKill, addUser, getAllBots, getAllUsers, getSettings, getUserRank, markScoreSubmitted, removeBot, removeUser, setBotHealth, updateCursor, updateHealth, updatePhysics, updateSettings } from './state.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/**
 * Initialize Socket.io event handlers
 */
export function initializeSocketHandlers(io: TypedServer): void {
  // Helper to apply damage with shield absorption
  const applyDamage = (user: any, damage: number): number => {
    if (user.shield > 0) {
      // Shield absorbs damage first
      const shieldDamage = Math.min(user.shield, damage);
      user.shield -= shieldDamage;
      damage -= shieldDamage;
      console.log(`🛡️ ${user.label} shield absorbed ${shieldDamage} damage (${user.shield} remaining)`);
    }

    if (damage > 0) {
      // Apply remaining damage to health
      const newHealth = Math.max(0, user.health - damage);
      updateHealth(user.id, newHealth);
      return newHealth;
    }

    return user.health;
  };

  // Centralized death handler
  const handleDeath = (userId: string, attackerId?: string) => {
    const user = getAllUsers().get(userId);
    const attacker = attackerId ? getAllUsers().get(attackerId) : null;

    if (user && attacker) {
      // Track stats
      addDeath(user.id);
      if (user.id !== attacker.id) {
        addKill(attacker.id);
        // Award/penalize points for player kill
        attacker.points = (attacker.points || 0) + 100;
        user.points = Math.max(0, (user.points || 0) - 50);
      }

      // Broadcast kill event
      io.emit('player:killed', {
        victimId: user.id,
        victimName: user.label,
        attackerId: attacker.id,
        attackerName: attacker.label
      });

      // Emit updated stats for both players
      io.emit('stats:update', {
        userId: user.id,
        kills: user.kills,
        deaths: user.deaths
      });
      if (user.id !== attacker.id) {
        io.emit('stats:update', {
          userId: attacker.id,
          kills: attacker.kills,
          deaths: attacker.deaths
        });
      }

      // Emit updated scoreboard snapshot
      io.emit('score:update', { scores: Array.from(getAllUsers().values()).map(u => ({
        playerId: u.id,
        playerName: u.label,
        score: u.points ?? 0,
        kills: u.kills ?? 0,
        deaths: u.deaths ?? 0,
        botKills: (u as any).botKills ?? 0,
      })) });
      console.log(`[DEATH] ${user.label} killed by ${attacker.label} `);
    } else if (user) {
      addDeath(user.id);
      // Emit updated stats
      io.emit('stats:update', {
        userId: user.id,
        kills: user.kills,
        deaths: user.deaths
      });
      console.log(`[DEATH] ${user.label} died`);
      io.emit('score:update', { scores: Array.from(getAllUsers().values()).map(u => ({
        playerId: u.id,
        playerName: u.label,
        score: u.points ?? 0,
        kills: u.kills ?? 0,
        deaths: u.deaths ?? 0,
        botKills: (u as any).botKills ?? 0,
      })) });
    }

    const RESPAWN_DELAY = 6000;
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
        user.x = (Math.random() - 0.5) * MAP_WIDTH;
        user.y = (Math.random() - 0.5) * MAP_HEIGHT;
        user.weaponType = 'machineGun';

        // Notify all clients about respawn (health update + position update)
        io.emit('health:update', {
          userId,
          health: 100,
          shield: user.shield || 0
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
  const laserSystem = new LaserSystem(mineSystem, io);

  // Start server-side game loop (60 TPS)
  setInterval(() => {
    mineSystem.update();
    powerUpSystem.update();
    bulletSystem.update();
    laserSystem.update();

    // Update physics (velocity, friction, bounds)
    updatePhysics();

    // Broadcast position updates for players with velocity (knockback effect)
    getAllUsers().forEach((user, userId) => {
      const hasVelocity = Math.abs(user.vx) > 0.1 || Math.abs(user.vy) > 0.1;
      if (hasVelocity) {
        io.emit('cursor:update', {
          userId,
          x: user.x,
          y: user.y,
          rotation: user.rotation,
          color: user.color,
          label: user.label,
          health: user.health,
          type: 'player',
          shield: user.shield
        });
      }
    });

    // Check collisions
    const users = getAllUsers();

    // Check powerup collection and mine collisions (only for alive players)
    users.forEach(user => {
      // Skip dead players
      if (user.health <= 0) return;

      const collectedPowerUp = powerUpSystem.checkCollection(user.x, user.y, user.radius);
      if (collectedPowerUp) {
        const powerup = powerUpSystem.collectPowerUp(collectedPowerUp.id, user.id);
        if (powerup) {
          if (powerup.type === 'weapon' && powerup.weaponType) {
            // Change weapon
            (user as any).weaponType = powerup.weaponType;
            console.log(`⚡ ${user.label} picked up ${powerup.weaponType}`);
          } else if (powerup.type === 'health') {
            // Restore 50 HP (capped at 100)
            const newHealth = Math.min(100, user.health + 50);
            updateHealth(user.id, newHealth);
            io.emit('health:update', { userId: user.id, health: newHealth, shield: user.shield });
            console.log(`❤️ ${user.label} picked up HEALTH PACK (${user.health} → ${newHealth})`);
          } else if (powerup.type === 'shield') {
            // Add 30 shield HP
            user.shield = 30;
            console.log(`🛡️ ${user.label} picked up SHIELD (${user.shield} HP)`);
          }
        }
      }

        // Check mine collision with player
        const hitMineId = mineSystem.checkPlayerCollision(user.x, user.y, user.radius);
        if (hitMineId) {
          mineSystem.explodeMine(hitMineId, user.id);
        }
      }
      // Player respawn timing handled by handleDeath
    );

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
        if (user.health <= 0) continue; // ignore dead players for collisions
        if (bullet.userId === user.id) continue; // can't shoot yourself
        const dx = bullet.x - user.x;
        const dy = bullet.y - user.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 <= USER_RADIUS * USER_RADIUS) {
          bulletSystem.removeBullet(bullet.id);
          const newHealth = applyDamage(user, 10);
          io.emit('health:update', { userId: user.id, health: newHealth, shield: user.shield });
          if (newHealth === 0) {
            handleDeath(user.id, bullet.userId);
          }
          return;
        }
      }

      // Bots
      const BOT_RADIUS = 25;
      const bots = getAllBots();
      for (const bot of bots) {
        if (bullet.userId === bot.id) continue; // bots can't shoot themselves
        if (bot.health <= 0) continue; // skip dead bots

        const dx = bullet.x - bot.x;
        const dy = bullet.y - bot.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 <= BOT_RADIUS * BOT_RADIUS) {
          bulletSystem.removeBullet(bullet.id);
          const newHealth = Math.max(0, bot.health - 10);
          setBotHealth(bot.id, newHealth);
          io.emit('health:update', { userId: bot.id, health: newHealth });

          // Award kill if bot died (transition from alive to dead)
          if (newHealth <= 0) {
            const shooter = getAllUsers().get(bullet.userId);
            if (shooter) {
              addKill(bullet.userId);
              io.emit('kill', {
                killerId: bullet.userId,
                killerName: shooter.label,
                victimId: bot.id,
                victimName: bot.label,
                points: 100
              });
              // Emit updated stats to all clients
              io.emit('stats:update', {
                userId: bullet.userId,
                kills: shooter.kills,
                deaths: shooter.deaths
              });
              console.log(`💀 ${shooter.label} killed bot ${bot.label}`);
            }
          }

          return;
        }
      }
    });
  }, 16); // 16ms = ~60 updates per second

  io.on('connection', async (socket: TypedSocket) => {
    // Extract playerKey from socket handshake query
    const playerKey = socket.handshake.query.playerKey as string | undefined;
    console.log(`🔌 User connected: ${socket.id}${playerKey ? ` [PlayerKey: ${playerKey}]` : ''}`);

    // Add user to state with playerKey
    const user = addUser(socket.id, playerKey);

    // Fetch real player name from hub if playerKey is provided
    if (playerKey) {
      const playerName = await getPlayerName(playerKey);
      if (playerName) {
        user.label = playerName;
        console.log(`✅ Player name fetched: ${playerName} (${playerKey})`);
      }
    }

    // Send player their own info (with updated name)
    socket.emit('player:info', {
      userId: user.id,
      label: user.label,
      color: user.color,
      kills: user.kills,
      deaths: user.deaths,
      health: user.health
    });

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
          shield: u.shield,
        };
      }
    });
    // Include bots in initial cursors sync
    getAllBots().forEach(bot => {
      cursors[bot.id] = {
        x: bot.x,
        y: bot.y,
        rotation: 0, // Client calculates rotation from movement
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
      // Ignore movement when dead
      const me = getAllUsers().get(socket.id);
      if (!me || me.health <= 0) return;

      // Clamp to map bounds (centered)
      const halfW = MAP_WIDTH / 2;
      const halfH = MAP_HEIGHT / 2;
      const clampedX = Math.max(-halfW, Math.min(x, halfW));
      const clampedY = Math.max(-halfH, Math.min(y, halfH));

      updateCursor(socket.id, clampedX, clampedY, rotation);

      // Broadcast new position to all other clients (optimized: only send x,y,rotation)
      const user = getAllUsers().get(socket.id);
      socket.broadcast.emit('cursor:update', {
        userId: socket.id,
        x,
        y,
        rotation: rotation || 0,
        color: user?.color || '#ffffff',
        label: user?.label || 'Player',
        health: user?.health || 100,
        type: 'player',
        activeWeapon: user?.weaponType as any,
        shield: user?.shield || 0,
      });
    });

    // Handle bullet shooting
    socket.on('bullet:shoot', ({ x, y, angle, isRocket }) => {
      const user = getAllUsers().get(socket.id);
      if (!user || user.health <= 0) return;

      // Generate unique bullet ID
      const bulletId = `${socket.id} -${Date.now()} -${Math.random()} `;

      // Add to server tracking
      bulletSystem.addBullet(bulletId, socket.id, x, y, angle, isRocket);

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
    socket.on('health:damage', ({ userId, health, attackerId }) => {
      const newHealth = updateHealth(userId, health);
      if (newHealth !== null) {
        // Broadcast health update to all clients
        io.emit('health:update', {
          userId,
          health: newHealth
        });

        // Check for death and schedule respawn
        if (newHealth <= 0) {
          handleDeath(userId, attackerId);
        }
      }
    });

    // Admin command: kick all players
    socket.on('admin:kickAll', () => {
      console.log('🚪 Admin command: Kick all players');
      // Disconnect all sockets
      setTimeout(() => {
        io.disconnectSockets();
        console.log('✅ All players kicked');
      }, 100);
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${socket.id} `);

      // Score submission removed - only admin can submit scores via "End Game" button

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
        points: u.points,
        playerId: u.playerKey!,
        playerName: u.label,
        score: u.points,
        kills: u.kills,
        deaths: u.deaths,
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

    // Admin: remove all bots
    socket.on('admin:removeAllBots', ({ token }: { token: string }) => {
      if (!isAuthorized(token)) return socket.emit('admin:error', { error: 'Unauthorized' });
      const bots = getAllBots();
      for (const b of bots) {
        removeBot(b.id);
      }
      updateSettings({ botCount: 0 });
      io.emit('admin:bots', { bots: getAllBots() });
      socket.emit('admin:removeAllBots:ok', { removed: true });
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

    socket.on('admin:kickPlayer', ({ token, id }: { token: string, id: string }) => {
      if (!isAuthorized(token)) return socket.emit('admin:error', { error: 'Unauthorized' });

      // Check if it's a user or bot
      const user = getAllUsers().get(id);
      const bot = getAllBots().find(b => b.id === id);

      if (bot) {
        console.log(`⚠️ Cannot kick bot ${bot.label} (${id}) - use Remove Bot instead`);
        return socket.emit('admin:kickPlayer:error', { error: 'Cannot kick bots, use Remove Bot button', id });
      }

      if (!user) {
        console.log(`⚠️ Player ${id} not found in users list (stale entry)`);
        return socket.emit('admin:kickPlayer:error', { error: 'Player not found (already disconnected?)', id });
      }

      const targetSocket = io.sockets.sockets.get(id);
      if (!targetSocket) {
        console.log(`⚠️ Socket ${id} not found for user ${user.label} (stale connection)`);
        // Remove from users list since socket is gone
        removeUser(id);
        return socket.emit('admin:kickPlayer:error', { error: 'Socket not found (cleaning up stale entry)', id });
      }

      console.log(`🚪 Admin kicked player: ${user.label} (${id})`);
      targetSocket.disconnect(true);
      socket.emit('admin:kickPlayer:ok', { kicked: id });
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

    // End game and submit all scores
    socket.on('admin:endGame', async ({ token }: { token: string }) => {
      if (!isAuthorized(token)) return socket.emit('admin:error', { error: 'Unauthorized' });

      console.log('🏁 Admin command: End game and submit scores');

      const users = getAllUsers();
      const totalPlayers = users.size;
      let submitted = 0;
      let failed = 0;
      let total = 0;

      // Submit scores for all players with playerKeys
      for (const [userId, user] of users.entries()) {
        if (user.playerKey && !user.scoreSubmitted) {
          total++;
          const rank = getUserRank(userId);
          const hubScore = calculatePlacementScore(rank, totalPlayers);

          console.log(`📊 Submitting score for ${user.label} - Rank: ${rank}/${totalPlayers}, Kills: ${user.kills}, Deaths: ${user.deaths}, Hub Score: ${hubScore}`);

          const success = await submitScoreToHub(user.playerKey, user.label, hubScore);
          if (success) {
            markScoreSubmitted(userId);
            submitted++;
            console.log(`✅ Score submitted for ${user.label} (${user.playerKey}): ${hubScore}/100`);
          } else {
            failed++;
            console.error(`❌ Failed to submit score for ${user.label} (${user.playerKey})`);
          }
        }
      }

      console.log(`🏁 End game complete: ${submitted}/${total} scores submitted, ${failed} failed`);
      socket.emit('admin:endGame:ok', { submitted, failed, total });
    });
  });

  // Start bots system and periodically refresh admin bots table
  botSystem.start();
  setInterval(() => {
    io.emit('admin:bots', { bots: getAllBots() });
  }, 500);

  // Periodically refresh admin players list
  setInterval(() => {
    const players = Array.from(getAllUsers().values()).map(u => ({
      id: u.id,
      label: u.label,
      x: u.x,
      y: u.y,
      health: u.health,
      points: u.points,
      playerId: u.playerKey!,
      playerName: u.label,
      score: u.points,
      kills: u.kills,
      deaths: u.deaths,
    }));
    io.emit('admin:players', { players });
  }, 500);
}
