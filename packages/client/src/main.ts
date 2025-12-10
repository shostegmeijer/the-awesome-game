import { MAP_HEIGHT, MAP_WIDTH } from '@awesome-game/shared';
import { AnnouncementSystem } from './announcements.js';
import { BulletSystem } from './bullets.js';
import { Camera } from './camera.js';
import { CanvasManager } from './canvas.js';
import { ControlsManager } from './controls.js';
import { CursorManager } from './cursor.js';
import { ExplosionSystem } from './explosions.js';
import { LaserSystem } from './laser.js';
import { MineSystem } from './mines.js';
import { ParticleSystem } from './particles.js';
import { PowerUpSystem } from './powerups.js';
import { ScoreManager } from './score.js';
import { ScreenShake } from './screenshake.js';
import { SocketManager } from './socket.js';
import './styles.css';
import { WeaponManager, WEAPONS, WeaponType } from './weapons.js';

console.log('🎮 Initializing multiplayer cursor game...');

// Get player key from URL
const urlParams = new URLSearchParams(window.location.search);
const playerKey = urlParams.get('playerKey') || undefined;

// Setup welcome overlay
const welcomeOverlay = document.getElementById('welcome-overlay');
const playerKeyDisplay = document.getElementById('player-key-display');
const startGameBtn = document.getElementById('start-game-btn');
const noKeyWarning = document.getElementById('no-key-warning');

// Display player key or warning
if (playerKey) {
  playerKeyDisplay!.textContent = playerKey;
  startGameBtn!.disabled = false;
} else {
  playerKeyDisplay!.textContent = 'NO PLAYER KEY';
  noKeyWarning!.style.display = 'block';
  noKeyWarning!.textContent = '⚠️ Player key required. Get one from the hub.';
  startGameBtn!.disabled = true;
  startGameBtn!.style.opacity = '0.5';
  startGameBtn!.style.cursor = 'not-allowed';
}

// Track if game has started
let gameStarted = false;

// Global console commands (accessible via browser console)
(window as any).kickAll = () => {
  console.log('🚪 Kicking all players...');
  socket.emit('admin:kickAll');
};
console.log('💡 Console commands available: kickAll()');


// Initialize canvas (but don't start game loop yet)
const canvas = new CanvasManager('game-canvas');

// Initialize socket connection (works both locally and on network)
const serverUrl = `http://${window.location.hostname}:3000`;
const socket = new SocketManager(serverUrl, playerKey);
console.log(`🔌 Connecting to server at ${serverUrl}`);

// Initialize cursor manager
const cursors = new CursorManager();

// Initialize particle system
const particles = new ParticleSystem();

// Initialize bullet system
const bullets = new BulletSystem();

// Initialize explosion system
const explosions = new ExplosionSystem();

// Initialize controls
const controls = new ControlsManager();

// Initialize new game systems
const weaponManager = new WeaponManager();
const powerUps = new PowerUpSystem();
const screenShake = new ScreenShake();
const scoreManager = new ScoreManager();
const announcements = new AnnouncementSystem();
const mines = new MineSystem();
const lasers = new LaserSystem();
const camera = new Camera(window.innerWidth, window.innerHeight);

// Track local cursor position (bright cyan for visibility)
let localCursor = { x: 0, y: 0, rotation: 0, health: 100, color: '#00FFFF', label: 'You' };
let targetPosition = { x: 0, y: 0 }; // Mouse target position
let respawnTimeEnd = 0; // Timestamp when respawn happens
let isDead = false; // Track death state
const followSpeed = 0.04; // Lower = more lag, higher = more responsive (increased delay)
const rotationSpeed = 0.1; // Smooth rotation interpolation

// Physics velocity for knockback
let playerVelocity = { vx: 0, vy: 0 };
const friction = 0.92; // Gradual slowdown

// Shooting rate limiting
let lastShotTime = 0;

// Collision settings
const SHIP_COLLISION_RADIUS = 25; // Pixels

// Log hub integration status
if (playerKey) {
  console.log('🎮 Hub integration enabled - scores will be auto-submitted on disconnect');
} else {
  console.warn('⚠️ No playerKey provided - playing in standalone mode');
}

// Helper function to trigger mine explosion with chain reactions - REMOVED (Server handles this)
// function triggerMineExplosion(mine: any, depth: number = 0): void { ... }

// Test bot configuration
const TEST_BOT_ENABLED = false; // Set to false to disable
const botId = 'test-bot';
let botAngle = 0; // For circular movement
const botRadius = 200; // Circle radius in pixels
const botSpeed = 0.02; // Rotation speed (radians per frame)

// Throttle utility - limits function calls to once per delay period
function throttle<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let lastCall = 0;
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  }) as T;
}

// Set up controls - shoot with weapon cooldown
controls.onAction('shoot', () => {
  if (localCursor.health <= 0) return; // Cannot shoot if dead

  const currentTime = Date.now();
  const weapon = weaponManager.getCurrentWeapon();

  if (currentTime - lastShotTime < weapon.cooldown) {
    return; // Still on cooldown
  }

  lastShotTime = currentTime;

  // Handle laser weapon differently
  if (weapon.type === WeaponType.LASER) {
    lasers.fire(
      () => ({ x: localCursor.x, y: localCursor.y, rotation: localCursor.rotation }),
      weapon.bulletLifetime,
      socket.getSocketId() || 'local',
      weapon.color
    );
    socket.emitLaserShoot(localCursor.x, localCursor.y, localCursor.rotation);
    console.log(`💥 ${weapon.icon} LASER!`);
    weaponManager.useAmmo();
    return;
  }

  // Get bullet data based on current weapon
  const bulletData = weaponManager.getBulletData(localCursor.x, localCursor.y, localCursor.rotation);
  const isRocket = weapon.type === WeaponType.ROCKET;

  // Spawn bullets locally and send to server
  bulletData.forEach(({ angle }) => {
    bullets.shoot(localCursor.x, localCursor.y, angle, socket.getSocketId() || 'local', weapon.color, isRocket);
    socket.emitBulletShoot(localCursor.x, localCursor.y, angle, isRocket);
  });

  console.log(`💥 ${weapon.icon} Pew!`);

  // Reset to machine gun after using special weapon
  // Check if we should reset weapon (if out of ammo)
  if (weaponManager.useAmmo()) {
    console.log('⚠️ Weapon empty, switching to Machine Gun');
  }
});

// Socket event handlers
socket.on('player:info', (data) => {
  console.log(`👤 Your player info: ${data.label}`);
  // Update local player label with fetched name from hub
  localCursor.label = data.label;
  localCursor.color = data.color;

  // Initialize score manager with player info (this happens after socket connects)
  scoreManager.initPlayer(data.userId, data.label);
  console.log('📊 Scoreboard initialized for', data.label);

  // Update welcome screen if still visible
  const playerNameDisplay = document.getElementById('player-name-display');
  if (playerNameDisplay && data.label !== 'You') {
    playerNameDisplay.textContent = data.label;
    playerNameDisplay.style.display = 'block';
  }
});

socket.onUserJoined((data) => {
  const myId = socket.getSocketId();
  console.log(`👋 User joined: ${data.label} (${data.userId}), myId: ${myId}`);
  // Never add ourselves to the cursors system (we're rendered as localCursor)
  if (data.userId === myId) {
    console.warn('⚠️ Ignoring user:joined for self');
    return;
  }
  // Register cursor immediately so we have the label/color
  console.log('✅ Adding remote cursor:', data.userId, data.label);
  cursors.updateCursor(data.userId, -10000, -10000, data.color, data.label);
  scoreManager.initPlayer(data.userId, data.label);
});

socket.onUserLeft((data) => {
  cursors.removeCursor(data.userId);
});

socket.onCursorsSync((data) => {
  const mySocketId = socket.getSocketId();
  // Filter out our own cursor before syncing
  const filteredCursors: Record<string, { x: number; y: number; color: string; label: string }> = {};
  Object.entries(data.cursors).forEach(([userId, cursor]) => {
    if (userId !== mySocketId) {
      filteredCursors[userId] = cursor;
    } else {
      console.warn('⚠️ Filtered self from cursorsSync');
    }
  });
  cursors.syncCursors(filteredCursors);
});

socket.onCursorUpdate((data) => {
  const myId = socket.getSocketId();
  // Never update our own cursor via network (we control it locally)
  if (data.userId === myId) {
    console.warn('⚠️ Received cursor:update for self - ignoring');
    return;
  }
  cursors.updateCursor(
    data.userId,
    data.x,
    data.y,
    data.color,
    data.label,
    data.health,
    data.type,
    data.rotation
  );
});

socket.onPlayerRespawn((data) => {
  const myId = socket.getSocketId();
  console.log('💀 Received respawn event:', data.userId, 'My ID:', myId);

  if (data.userId === myId) {
    // Local player respawn
    respawnTimeEnd = data.respawnTime;
    isDead = true;
    console.log(`🕒 Respawning in ${Math.ceil((data.respawnTime - Date.now()) / 1000)}s`);
  } else {
    // Other player respawn - remove their cursor temporarily (they'll respawn at new position)
    console.log(`👻 Other player respawning: ${data.userId}`);
    cursors.removeCursor(data.userId);
  }
});

socket.on('player:killed', (data) => {
  const myId = socket.getSocketId();

  if (data.attackerId === myId && data.victimId !== myId) {
    // I killed someone!
    announcements.announceKill('You', data.victimName, 100);
    scoreManager.addPoints(myId, 100);
  } else if (data.victimId === myId) {
    // I died (handled by death logic mostly, but could add specific message here)
    announcements.show('WASTED', `Killed by ${data.attackerName}`, '#FF0000', 4000);
  } else {
    // Someone else killed someone else
    announcements.show(`${data.attackerName} 🔫 ${data.victimName}`, '', '#FFFFFF', 2000);
  }
});

// Handle bullet spawn from network
socket.onBulletSpawn((data) => {
  const mySocketId = socket.getSocketId();

  if (data.userId === mySocketId) {
    // For our own bullets, use the server's position/velocity
    bullets.spawnFromNetwork(data.x, data.y, data.vx, data.vy, data.userId, data.color);
  } else {
    // For remote players, spawn from where WE currently see their cursor
    // This keeps smooth interpolation and avoids position snapping
    const remoteCursor = cursors.getCursors().get(data.userId);
    if (remoteCursor) {
      // Calculate angle from velocity
      const angle = Math.atan2(data.vy, data.vx);
      bullets.shoot(remoteCursor.x, remoteCursor.y, angle, data.userId, data.color, data.isRocket);
    }
  }
});

// Handle health updates from network
// Handle health updates from network
socket.onHealthUpdate((data) => {
  const myId = socket.getSocketId();
  if (data.userId === myId || data.userId === 'local') {
    const oldHealth = localCursor.health;
    localCursor.health = data.health;
    console.log(`❤️ My health updated: ${oldHealth} → ${localCursor.health}`);

    // Visual feedback for taking damage
    if (localCursor.health < oldHealth && localCursor.health > 0) {
      particles.explode(localCursor.x, localCursor.y, localCursor.color, 100);
      screenShake.shake(5, 100);
    }

    // Death explosion
    if (oldHealth > 0 && localCursor.health <= 0) {
      console.log('💀 You died!');
      explosions.explode(localCursor.x, localCursor.y, localCursor.color, 4);
      particles.explode(localCursor.x, localCursor.y, localCursor.color, 1000);
      screenShake.shake(25, 500);

      // MASSIVE grid explosion shockwave
      const explosionForce = 100;
      const rings = 5;
      for (let ring = 0; ring < rings; ring++) {
        const ringRadius = ring * 30;
        for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
          const forceX = Math.cos(angle) * explosionForce;
          const forceY = Math.sin(angle) * explosionForce;
          const x = localCursor.x + Math.cos(angle) * ringRadius;
          const y = localCursor.y + Math.sin(angle) * ringRadius;
          grid.applyForce(x, y, forceX, forceY);
        }
      }
    }

    if (localCursor.health > 0) {
      respawnTimeEnd = 0;
      isDead = false;
    }
  } else {
    const cursor = cursors.getCursors().get(data.userId);
    const oldHealth = cursor?.health || 100;
    console.log(`❤️ Enemy health updated: ${data.userId} → ${data.health}`);
    cursors.setHealth(data.userId, data.health);

    // Visual feedback for enemy taking damage
    if (cursor && data.health < oldHealth && data.health > 0) {
      particles.explode(cursor.x, cursor.y, cursor.color, 100);
      screenShake.shake(3, 50);
    }

    // Enemy death explosion
    if (cursor && oldHealth > 0 && data.health <= 0) {
      console.log(`💀 ${cursor.label} died!`);
      explosions.explode(cursor.x, cursor.y, cursor.color, 4);
      particles.explode(cursor.x, cursor.y, cursor.color, 1000);
      screenShake.shake(20, 400);
    }
  }
});

// Handle knockback from server
socket.on('knockback', (data) => {
  const myId = socket.getSocketId();
  console.log('💥 Knockback event:', data.userId, 'myId:', myId);
  if (data.userId === myId) {
    console.log('✅ Applying knockback to self:', data.vx, data.vy);
    playerVelocity.vx += data.vx;
    playerVelocity.vy += data.vy;
  } else {
    console.log('⏭️ Ignoring knockback for other player:', data.userId);
  }
});

// Handle mine events
socket.on('mine:spawn', (data) => {
  mines.addMine(data);
});

socket.on('mine:sync', (data) => {
  mines.syncMines(data.mines);
});

socket.on('mine:explode', (data) => {
  mines.removeMine(data.mineId);

  // Visual effects
  explosions.explode(data.x, data.y, '#FF6600', 3);
  particles.explode(data.x, data.y, '#FF6600', 400);
  screenShake.shake(15, 300);

  // Apply shockwave to grid
  for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
    const forceX = Math.cos(angle) * 50;
    const forceY = Math.sin(angle) * 50;
    grid.applyForce(data.x, data.y, forceX, forceY);
  }

  // Announce if we triggered it
  /*
  if (data.triggeredBy === socket.getSocketId() || data.triggeredBy === 'local') {
    announcements.announceMineExplosion('You', 0);
  }
  */
});

// Handle powerup events
socket.on('powerup:spawn', (data) => {
  powerUps.addPowerUp(data);
});

socket.on('powerup:sync', (data) => {
  powerUps.syncPowerUps(data.powerups);
});

socket.on('powerup:collect', (data) => {
  powerUps.removePowerUp(data.powerUpId);

  const weapon = WEAPONS[data.weaponType];

  // If we collected it
  if (data.userId === socket.getSocketId() || data.userId === 'local') {
    weaponManager.setWeapon(data.weaponType); // One-time use
    announcements.announcePowerUp(weapon.name, weapon.icon);
    scoreManager.addPoints(socket.getSocketId() || 'local', 50);
  }

  console.log(`✨ Collected: ${weapon.name} by ${data.userId}`);
});

// Handle remote lasers
socket.on('laser:spawn', (data) => {
  // Don't duplicate local laser
  if (data.userId === socket.getSocketId()) return;

  // Find the remote cursor to attach the laser to (for rotation updates)
  const remoteCursor = cursors.getCursors().get(data.userId);

  lasers.fire(
    () => {
      // If we have the cursor, follow it. Otherwise use static spawn pos
      if (remoteCursor) {
        return { x: remoteCursor.x, y: remoteCursor.y, rotation: remoteCursor.rotation };
      }
      return { x: data.x, y: data.y, rotation: data.angle };
    },
    20, // Short lifetime for remote lasers as they are event-based?
    // Actually, main.ts uses weapon.bulletLifetime which is usually ~10-20 frames for laser?
    // Let's assume a standard duration or we should have passed it.
    // For now, 20 frames (approx 300ms) is decent for a burst laser.
    data.userId,
    data.color
  );
});

// Get grid for applying forces
const grid = canvas.getGrid();

// Prerender map border
const borderCanvas = document.createElement('canvas');
borderCanvas.width = MAP_WIDTH + 100; // Add padding for glow
borderCanvas.height = MAP_HEIGHT + 100;
const borderCtx = borderCanvas.getContext('2d')!;

// Draw border with bloom to offscreen canvas
// We want the border to be centered in the canvas with 50px padding
borderCtx.shadowBlur = 30;
borderCtx.shadowColor = '#00FFFF';
borderCtx.strokeStyle = '#00FFFF';
borderCtx.lineWidth = 4;
borderCtx.strokeRect(50, 50, MAP_WIDTH, MAP_HEIGHT);

// Outer glow layer
borderCtx.globalAlpha = 0.3;
borderCtx.lineWidth = 10;
borderCtx.strokeRect(50, 50, MAP_WIDTH, MAP_HEIGHT);

// Initialize test bot if enabled
if (TEST_BOT_ENABLED) {
  const centerX = 0;
  const centerY = 0;
  const botX = centerX + Math.cos(botAngle) * botRadius;
  const botY = centerY + Math.sin(botAngle) * botRadius;

  cursors.updateCursor(botId, botX, botY, '#FF00FF', 'Bot');
  scoreManager.initPlayer(botId, 'Bot');
  console.log('🤖 Test bot initialized');
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.resize(window.innerWidth, window.innerHeight);
});

// Function to start the game
function startGame() {
  gameStarted = true;
  welcomeOverlay!.classList.add('hidden');
  console.log('🎮 Game started!');
}

// Start button click handler
startGameBtn!.addEventListener('click', () => {
  startGame();
});

// Also allow Enter key to start
window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !gameStarted) {
    startGame();
  }
});

// Start render loop
canvas.startRenderLoop(() => {
  // Don't update game if not started yet
  if (!gameStarted) {
    return;
  }
  // Update camera to follow local player
  camera.follow(localCursor.x, localCursor.y);

  // Get rendering context
  const ctx = canvas.getCanvas().getContext('2d')!;

  // Apply camera transform (affects everything rendered after this)
  camera.apply(ctx);

  // Update and render grid (now in world space)
  grid.update();
  grid.render(ctx);

  // Draw prerendered border (adjusted for centered coordinates)
  // The border canvas has (0,0) at top-left + 50 padding.
  // We drew the rect at (-W/2, -H/2).
  // So to draw it correctly, we need to position the canvas such that its center aligns with (0,0).
  // Canvas size is W+100, H+100. Center is at W/2+50, H/2+50.
  // Wait, we translated 50,50 then drew at -W/2.
  // So the top-left of the rect is at (50 - W/2, 50 - H/2) on the canvas.
  // We want to draw this image so that the rect aligns with world coordinates.
  // The rect top-left in world is -W/2, -H/2.
  // The rect top-left in canvas is 50 - W/2, 50 - H/2.
  // So if we draw the canvas at (-50, -50) relative to world origin? No.
  // Let's simplify.
  // World Rect: [-1000, -1000] to [1000, 1000].
  // Canvas: 2100x2100.
  // We want the canvas to cover [-1050, -1050] to [1050, 1050].
  // So we drawImage at x=-1050, y=-1050.
  ctx.drawImage(borderCanvas, -MAP_WIDTH / 2 - 50, -MAP_HEIGHT / 2 - 50);

  // Apply knockback velocity (physics)
  localCursor.x += playerVelocity.vx;
  localCursor.y += playerVelocity.vy;

  // Apply friction to velocity
  playerVelocity.vx *= friction;
  playerVelocity.vy *= friction;

  // Stop if velocity is very small
  if (Math.abs(playerVelocity.vx) < 0.01) playerVelocity.vx = 0;
  if (Math.abs(playerVelocity.vy) < 0.01) playerVelocity.vy = 0;

  // Smooth follow: lerp local cursor toward target position (after knockback)
  const dx = targetPosition.x - localCursor.x;
  const dy = targetPosition.y - localCursor.y;

  localCursor.x += dx * followSpeed;
  localCursor.y += dy * followSpeed;

  // Clamp position to map bounds (centered)
  localCursor.x = Math.max(-MAP_WIDTH / 2, Math.min(localCursor.x, MAP_WIDTH / 2));
  localCursor.y = Math.max(-MAP_HEIGHT / 2, Math.min(localCursor.y, MAP_HEIGHT / 2));

  // Calculate target rotation based on movement direction
  const targetRotation = Math.atan2(dy, dx);

  // Smooth rotation interpolation
  let rotationDiff = targetRotation - localCursor.rotation;

  // Normalize angle difference to [-PI, PI]
  while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
  while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;

  localCursor.rotation += rotationDiff * rotationSpeed;

  // Apply force to grid from local player movement
  grid.applyForce(localCursor.x, localCursor.y, dx * followSpeed, dy * followSpeed);

  // Update test bot position (circular movement)
  if (TEST_BOT_ENABLED) {
    botAngle += botSpeed;
    const centerX = 0;
    const centerY = 0;
    const botX = centerX + Math.cos(botAngle) * botRadius;
    const botY = centerY + Math.sin(botAngle) * botRadius;

    cursors.updateCursor(botId, botX, botY);
  }

  // Update remote cursors (smooth interpolation every frame)
  cursors.update();

  // Update particles
  particles.update();

  // Update explosions
  explosions.update();

  // Update bullets and apply grid forces
  bullets.update();

  // Apply forces from bullets to grid
  bullets.getBullets().forEach(bullet => {
    grid.applyForce(bullet.x, bullet.y, bullet.vx * 0.3, bullet.vy * 0.3);
  });

  // Update new game systems
  const currentTime = performance.now();
  powerUps.update(currentTime);
  mines.update(currentTime);
  screenShake.update();
  announcements.update();

  // Update laser system
  lasers.update();

  // Check power-up collection - NOW HANDLED BY SERVER
  // We just render what the server tells us
  /*
  const collectedWeapon = powerUps.checkCollection(localCursor.x, localCursor.y);
  if (collectedWeapon) {
    weaponManager.setWeapon(collectedWeapon); // One-time use
    const weapon = WEAPONS[collectedWeapon];
    announcements.announcePowerUp(weapon.name, weapon.icon);
    scoreManager.addPoints(socket.getSocketId() || 'local', 50);
  }
  */

  // Spawn particles from rockets
  bullets.getBullets().forEach(bullet => {
    if (bullet.isRocket) {
      particles.spawn(bullet.x, bullet.y, Math.atan2(bullet.vy, bullet.vx) + Math.PI, '#FF6600', 10);
    }
  });

  // Check for rocket explosions (after traveling for a while)
  bullets.getBullets().forEach(bullet => {
    if (bullet.isRocket && bullet.lifetime > 60) { // After 1 second
      // Explode rocket!
      explosions.explode(bullet.x, bullet.y, bullet.color, 4);
      particles.explode(bullet.x, bullet.y, bullet.color, 500);
      screenShake.shake(20, 400);

      // Apply damage to nearby players
      const targets = [
        { x: localCursor.x, y: localCursor.y, id: socket.getSocketId() || 'local' }
      ];
      cursors.getCursors().forEach((cursor, id) => {
        targets.push({ x: cursor.x, y: cursor.y, id });
      });

      const explosionRadius = 100;
      targets.forEach(target => {
        const dx = target.x - bullet.x;
        const dy = target.y - bullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < explosionRadius) {
          if (target.id === socket.getSocketId() || target.id === 'local') {
            localCursor.health = Math.max(0, localCursor.health - WEAPONS[WeaponType.ROCKET].damage);
            console.log(`🚀 Hit by rocket! Health: ${localCursor.health}`);
          } else {
            cursors.damageCursor(target.id, WEAPONS[WeaponType.ROCKET].damage);
          }
        }
      });

      // Remove rocket after explosion
      const index = bullets.getBullets().indexOf(bullet);
      if (index > -1) {
        bullets.getBullets().splice(index, 1);
      }
    }
  });

  // Check mine collisions with bullets - NOW HANDLED BY SERVER
  /*
  bullets.getBullets().forEach(bullet => {
    const hitMine = mines.checkBulletCollision(bullet.x, bullet.y);
    if (hitMine) {
      triggerMineExplosion(hitMine);
    }
  });
  */

  // Check mine collisions with local player - NOW HANDLED BY SERVER
  /*
  const hitMine = mines.checkPlayerCollision(localCursor.x, localCursor.y, SHIP_COLLISION_RADIUS);
  if (hitMine && localCursor.health > 0) {
    announcements.announceMineExplosion('You', 0);
    triggerMineExplosion(hitMine);
  }
  */

  // ===== SERVER NOW HANDLES ALL COLLISION DETECTION =====
  // Client-side collision detection removed - server is authoritative
  // All damage and health updates come from server via socket events

  const mySocketId = socket.getSocketId();

  /* DISABLED - Server handles collisions now
  // Check laser collisions - local player
  const laserAttackerId = mySocketId ? lasers.checkCollision(localCursor.x, localCursor.y, SHIP_COLLISION_RADIUS, mySocketId) : null;

  if (laserAttackerId) {
    localCursor.health = Math.max(0, localCursor.health - WEAPONS[WeaponType.LASER].damage);
    console.log(`🔥 Hit by laser! Health: ${localCursor.health}`);

    // Send health update to server
    socket.emitHealthDamage(localCursor.health, laserAttackerId);

    if (localCursor.health > 0) {
      particles.spawn(localCursor.x, localCursor.y, Math.random() * Math.PI * 2, '#00FF00', 5);
    }
  }

  // Check collisions - local player (use socket ID to avoid hitting yourself)
  // Check collisions - local player (use socket ID to avoid hitting yourself)
  const hitBullet = mySocketId ? bullets.checkCollision(localCursor.x, localCursor.y, SHIP_COLLISION_RADIUS, mySocketId) : null;

  if (hitBullet) {
    const oldHealth = localCursor.health;
    // Determine damage based on bullet type (rocket vs normal)
    const damage = hitBullet.isRocket ? WEAPONS[WeaponType.ROCKET].damage : WEAPONS[WeaponType.MACHINE_GUN].damage;

    localCursor.health = Math.max(0, localCursor.health - damage);
    console.log(`💥 You were hit! Health: ${localCursor.health}`);

    // Send health update to server
    socket.emitHealthDamage(localCursor.health, hitBullet.ownerId);

    // Hit particles (not death)
    if (localCursor.health > 0) {
      particles.explode(localCursor.x, localCursor.y, localCursor.color, 100);
      screenShake.shake(5, 100);
    }

    // Death explosion!
    if (oldHealth > 0 && localCursor.health <= 0) {
      console.log('💀 You died!');
      explosions.explode(localCursor.x, localCursor.y, localCursor.color, 4);
      particles.explode(localCursor.x, localCursor.y, localCursor.color, 1000);
      screenShake.shake(25, 500);

      // Death penalty
      scoreManager.addPoints(mySocketId!, -50);

      // MASSIVE grid explosion shockwave
      const explosionForce = 100;
      const rings = 5;
      for (let ring = 0; ring < rings; ring++) {
        const ringRadius = ring * 30;
        for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
          const forceX = Math.cos(angle) * explosionForce;
          const forceY = Math.sin(angle) * explosionForce;
          const x = localCursor.x + Math.cos(angle) * ringRadius;
          const y = localCursor.y + Math.sin(angle) * ringRadius;
          grid.applyForce(x, y, forceX, forceY);
        }
      }

      // Respawn handled by server
      console.log('⏳ Waiting for server respawn...');
    }
  }
  */ // End of disabled client-side collision code

  /* DISABLED - Server handles remote player collisions too
  // Check laser collisions - remote players
  cursors.getCursors().forEach((cursor, userId) => {
    if (lasers.checkCollision(cursor.x, cursor.y, SHIP_COLLISION_RADIUS, userId)) {
      const isDead = cursors.damageCursor(userId, WEAPONS[WeaponType.LASER].damage);
      if (!isDead && cursor.health > 0) {
        particles.spawn(cursor.x, cursor.y, Math.random() * Math.PI * 2, '#00FF00', 5);
      }
    }
  });

  // Check collisions - remote players
  cursors.getCursors().forEach((cursor, userId) => {
    if (bullets.checkCollision(cursor.x, cursor.y, SHIP_COLLISION_RADIUS, userId)) {
      const oldHealth = cursor.health;
      const weapon = weaponManager.getCurrentWeapon();
      const isDead = cursors.damageCursor(userId, weapon.damage);

      // Hit particles (not death)
      if (!isDead && cursor.health > 0) {
        particles.explode(cursor.x, cursor.y, cursor.color, 100);
        screenShake.shake(5, 100);
      }

      // Death explosion for remote players!
      if (isDead && oldHealth > 0) {
        console.log(`💀 ${cursor.label} died!`);
        explosions.explode(cursor.x, cursor.y, cursor.color, 4);
        particles.explode(cursor.x, cursor.y, cursor.color, 1000);
        screenShake.shake(25, 500);

        // Award kill points
        if (mySocketId) {
          scoreManager.addKill(mySocketId, userId);
          announcements.announceKill('You', cursor.label, 100);
        }

        // MASSIVE grid explosion shockwave
        const explosionForce = 100;
        const rings = 5;
        for (let ring = 0; ring < rings; ring++) {
          const ringRadius = ring * 30;
          for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
            const forceX = Math.cos(angle) * explosionForce;
            const forceY = Math.sin(angle) * explosionForce;
            const x = cursor.x + Math.cos(angle) * ringRadius;
            const y = cursor.y + Math.sin(angle) * ringRadius;
            grid.applyForce(x, y, forceX, forceY);
          }
        }

        // Remove dead player (bot will respawn)
        if (userId === botId) {
          cursors.removeCursor(botId);
          // Respawn bot after 3 seconds
          setTimeout(() => {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            botAngle = Math.random() * Math.PI * 2;
            const botX = centerX + Math.cos(botAngle) * botRadius;
            const botY = centerY + Math.sin(botAngle) * botRadius;
            cursors.updateCursor(botId, botX, botY, '#FF00FF', 'Bot');
            console.log('🤖 Bot respawned!');
          }, 3000);
        }
      }
    }
  });
  */ // End of disabled remote collision code

  // Update controls (for continuous actions)
  controls.update();

  // Clean up stale cursors
  cursors.cleanupStaleCursors(5000);

  // Get rendering context - ALREADY GOT IT ABOVE
  // const ctx = canvas.getCanvas().getContext('2d')!;

  // Apply screen shake
  ctx.save();
  screenShake.apply(ctx);

  // Render mines
  mines.render(ctx);

  // Render power-ups
  powerUps.render(ctx);

  // Render particles (behind cursors)
  particles.render(ctx);

  // Render explosion rings
  explosions.render(ctx);

  // Render bullets
  bullets.render(ctx);

  // Render laser beams
  lasers.render(ctx);

  // Render local cursor (your own) with rotation and health - only if alive
  if (localCursor.health > 0) {
    // Spawn particles based on movement speed (more particles = faster movement)
    const dx = targetPosition.x - localCursor.x;
    const dy = targetPosition.y - localCursor.y;
    const speed = Math.sqrt(dx * dx + dy * dy);
    if (speed > 0.5) {
      particles.spawn(localCursor.x, localCursor.y, localCursor.rotation, '#FF6600', speed);
    }

    canvas.drawCursor(localCursor.x, localCursor.y, localCursor.color, localCursor.label, localCursor.rotation, localCursor.health, 'player');
  }

  // Render all remote cursors with rotation and spawn their particles
  cursors.getCursors().forEach((cursor) => {
    // Skip dead players
    if (cursor.health <= 0) return;

    // Calculate movement for particle spawning
    const dx = cursor.x - cursor.prevX;
    const dy = cursor.y - cursor.prevY;
    const speed = Math.sqrt(dx * dx + dy * dy);

    // Apply force to grid from remote player movement
    if (speed > 0.5) {
      grid.applyForce(cursor.x, cursor.y, dx, dy);
      particles.spawn(cursor.x, cursor.y, cursor.rotation, '#FF6600', speed);
    }

    canvas.drawCursor(cursor.x, cursor.y, cursor.color, cursor.label, cursor.rotation, cursor.health, cursor.type || 'player');
  });

  // Draw grid overlay AFTER everything to pick up glow
  canvas.drawGridOverlay();

  // Reset screen shake
  ctx.restore();

  // Reset camera transform for UI
  camera.reset(ctx);

  // Render UI elements (not affected by screen shake)
  const currentSocketId = socket.getSocketId();
  if (currentSocketId) {
    scoreManager.renderUI(ctx, currentSocketId);
  }
  announcements.render(ctx);

  // Debug: Show cursor count
  const cursorCount = cursors.getCursors().size;
  ctx.save();
  ctx.fillStyle = '#FFFF00';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`Cursors: ${cursorCount}`, 20, window.innerHeight - 20);
  ctx.restore();

  // Display current weapon
  // Display current weapon (if alive)
  if (localCursor.health > 0) {
    const currentWeapon = weaponManager.getCurrentWeapon();
    const ammo = weaponManager.getAmmo();
    const ammoText = currentWeapon.maxAmmo > 0 ? ` x${ammo}` : '';

    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = currentWeapon.color;
    ctx.fillStyle = currentWeapon.color;
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${currentWeapon.icon} ${currentWeapon.name}${ammoText}`, window.innerWidth - 30, window.innerHeight - 30);
    ctx.restore();
  } else if (isDead && respawnTimeEnd > 0) {
    // Display respawn timer only if we received the respawn event
    const remaining = Math.max(0, Math.ceil((respawnTimeEnd - Date.now()) / 1000));
    ctx.save();
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#FF0000';
    ctx.fillText(`RESPAWN IN ${remaining}`, window.innerWidth / 2, window.innerHeight / 2);
    ctx.restore();
  } else if (localCursor.health <= 0) {
    // Dead but waiting for server respawn event
    ctx.save();
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#FF0000';
    ctx.fillText('WASTED', window.innerWidth / 2, window.innerHeight / 2);
    ctx.restore();
  }
  ctx.restore();
});

// Get canvas element for mouse events
const canvasElement = canvas.getCanvas();

// Create throttled emit function (local network = much faster polling)
// 5ms = 200 updates/sec (great for local network with low latency)
const throttledEmit = throttle((x: number, y: number, rotation: number) => {
  socket.emitCursorMove(x, y, rotation);
}, 5);

// Track mouse movement
canvasElement.addEventListener('mousemove', (e: MouseEvent) => {
  // Convert screen coordinates to world coordinates
  const worldPos = camera.screenToWorld(e.clientX, e.clientY);
  const x = worldPos.x;
  const y = worldPos.y;

  // Update target position (cursor will smoothly follow)
  targetPosition.x = x;
  targetPosition.y = y;

  // Send actual cursor position to server (throttled)
  throttledEmit(localCursor.x, localCursor.y, localCursor.rotation);
});

console.log('✅ App initialized - move your mouse and press SPACE to shoot!');
console.log('🎮 Controls:', controls.getBindings());
if (playerKey) {
  console.log('📊 Score will be auto-submitted to INNSPIRE hub on disconnect');
}
