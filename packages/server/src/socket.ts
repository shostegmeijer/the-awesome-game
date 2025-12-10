
import { Server, Socket } from 'socket.io';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  CursorData,
  MAP_WIDTH,
  MAP_HEIGHT
} from '@awesome-game/shared';
import { addUser, removeUser, updateCursor, getAllUsers, updateHealth, addKill, addDeath, getUserRank, markScoreSubmitted, applyKnockback, updatePhysics } from './state.js';
import { MineSystem } from './mines.js';
import { PowerUpSystem } from './powerups.js';
import { BulletSystem } from './bullets.js';
import { LaserSystem } from './lasers.js';
import { submitScoreToHub, calculatePlacementScore, getPlayerName } from './hub-api.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/**
 * Initialize Socket.io event handlers
 */
export function initializeSocketHandlers(io: TypedServer): void {
  // Centralized death handler
  const handleDeath = (userId: string, attackerId?: string) => {
    const user = getAllUsers().get(userId);
    const attacker = attackerId ? getAllUsers().get(attackerId) : null;

    if (user && attacker) {
      // Track stats
      addDeath(user.id);
      if (user.id !== attacker.id) {
        addKill(attacker.id);
      }

      // Broadcast kill event
      io.emit('player:killed', {
        victimId: user.id,
        victimName: user.label,
        attackerId: attacker.id,
        attackerName: attacker.label
      });
      console.log(`[DEATH] ${user.label} killed by ${attacker.label} `);
    } else if (user) {
      addDeath(user.id);
      console.log(`[DEATH] ${user.label} died`);
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
          health: 100
        });

        // Force position update
        io.emit('cursor:update', {
          userId,
          x: user.x,
          y: user.y,
          rotation: 0
        });
      }
    }, RESPAWN_DELAY);
  };

  // Initialize game systems
  const mineSystem = new MineSystem(io, handleDeath);
  const powerUpSystem = new PowerUpSystem(io);
  const bulletSystem = new BulletSystem();
  const laserSystem = new LaserSystem(mineSystem);

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
          rotation: user.rotation
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

    // Check bullet collisions with players (server-authoritative)
    bulletSystem.getBullets().forEach(bullet => {
      let bulletHit = false;

      users.forEach(user => {
        // Skip if bullet owner or already dead
        if (bullet.userId === user.id || user.health <= 0) return;

        // Check collision
        const dx = user.x - bullet.x;
        const dy = user.y - bullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < user.radius + 3) { // 3 = bullet radius
          bulletHit = true;

          if (bullet.isRocket) {
            // Rocket creates area explosion (handled below)
            return;
          }

          // Standard bullet hit
          const knockbackStrength = 8; // Increased from 2.5
          const bulletSpeed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
          const knockbackX = (bullet.vx / bulletSpeed) * knockbackStrength;
          const knockbackY = (bullet.vy / bulletSpeed) * knockbackStrength;

          applyKnockback(user.id, knockbackX, knockbackY);

          // Broadcast knockback to client
          io.emit('knockback', {
            userId: user.id,
            vx: knockbackX,
            vy: knockbackY
          });

          const damage = 15;
          const oldHealth = user.health;
          const newHealth = Math.max(0, user.health - damage);
          updateHealth(user.id, newHealth);

          io.emit('health:update', {
            userId: user.id,
            health: newHealth
          });

          if (oldHealth > 0 && newHealth <= 0) {
            handleDeath(user.id, bullet.userId);
          }
        }
      });

      // Handle rocket explosion (splash damage and knockback)
      if (bulletHit && bullet.isRocket) {
        const explosionRadius = 150; // Rocket blast radius
        const explosionDamage = 100;

        users.forEach(user => {
          const dx = user.x - bullet.x;
          const dy = user.y - bullet.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < explosionRadius) {
            // Radial knockback (away from explosion)
            if (distance > 0.1) {
              const knockbackStrength = 25; // Massive explosion
              const distanceFactor = 1 - (distance / explosionRadius);
              const force = knockbackStrength * distanceFactor;
              const knockbackX = (dx / distance) * force;
              const knockbackY = (dy / distance) * force;

              applyKnockback(user.id, knockbackX, knockbackY);

              // Broadcast knockback to client
              io.emit('knockback', {
                userId: user.id,
                vx: knockbackX,
                vy: knockbackY
              });
            }

            // Splash damage (less at distance)
            const distanceFactor = 1 - (distance / explosionRadius);
            const damage = Math.floor(explosionDamage * distanceFactor);
            const oldHealth = user.health;
            const newHealth = Math.max(0, user.health - damage);
            updateHealth(user.id, newHealth);

            io.emit('health:update', {
              userId: user.id,
              health: newHealth
            });

            // Don't give self kill credit for rocket suicide
            if (oldHealth > 0 && newHealth <= 0) {
              const isOwnRocket = bullet.userId === user.id;
              handleDeath(user.id, isOwnRocket ? undefined : bullet.userId);
            }
          }
        });
      }

      if (bulletHit) {
        bulletSystem.removeBullet(bullet.id);
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
      color: user.color
    });

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

      // Clamp to map bounds (centered)
      const halfW = MAP_WIDTH / 2;
      const halfH = MAP_HEIGHT / 2;
      const clampedX = Math.max(-halfW, Math.min(x, halfW));
      const clampedY = Math.max(-halfH, Math.min(y, halfH));

      updateCursor(socket.id, clampedX, clampedY, rotation);

      // Broadcast new position to all other clients (optimized: only send x,y,rotation)
      socket.broadcast.emit('cursor:update', {
        userId: socket.id,
        x: clampedX,
        y: clampedY,
        rotation
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
    socket.on('laser:shoot', ({ x, y, angle }) => {
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
      const user = getAllUsers().get(socket.id);
      console.log(`🔌 User disconnected: ${socket.id} `);

      // Submit score to hub if player has a playerKey and hasn't submitted yet
      if (user && user.playerKey && !user.scoreSubmitted) {
        const rank = getUserRank(socket.id);
        const totalPlayers = getAllUsers().size;
        const hubScore = calculatePlacementScore(rank, totalPlayers);

        console.log(`📊 Player stats - Rank: ${rank}/${totalPlayers}, Kills: ${user.kills}, Deaths: ${user.deaths}, Hub Score: ${hubScore}`);

        const success = await submitScoreToHub(user.playerKey, user.label, hubScore);
        if (success) {
          markScoreSubmitted(socket.id);
          console.log(`✅ Score submitted for ${user.label} (${user.playerKey}): ${hubScore}/100`);
        }
      }

      removeUser(socket.id);
      io.emit('user:left', { userId: socket.id });
    });
  });
}
