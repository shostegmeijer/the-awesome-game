import { CanvasManager } from './canvas.js';
import { SocketManager } from './socket.js';
import { CursorManager } from './cursor.js';
import { ParticleSystem } from './particles.js';
import { BulletSystem } from './bullets.js';
import { ControlsManager } from './controls.js';
import { ExplosionSystem } from './explosions.js';
import { WeaponManager, WEAPONS, WeaponType } from './weapons.js';
import { PowerUpSystem } from './powerups.js';
import { ScreenShake } from './screenshake.js';
import { ScoreManager } from './score.js';
import { AnnouncementSystem } from './announcements.js';
import { MineSystem } from './mines.js';
import { LaserSystem } from './laser.js';
import './styles.css';

console.log('🎮 Initializing multiplayer cursor game...');

// Initialize canvas
const canvas = new CanvasManager('game-canvas');

// Initialize socket connection (works both locally and on network)
const serverUrl = `http://${window.location.hostname}:3000`;
const socket = new SocketManager(serverUrl);
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

// Track local cursor position (bright cyan for visibility)
let localCursor = { x: 0, y: 0, rotation: 0, health: 50, color: '#00FFFF', label: 'You' };
let targetPosition = { x: 0, y: 0 }; // Mouse target position
const followSpeed = 0.08; // Lower = more lag, higher = more responsive (increased delay)
const rotationSpeed = 0.1; // Smooth rotation interpolation

// Shooting rate limiting
let lastShotTime = 0;

// Collision settings
const SHIP_COLLISION_RADIUS = 25; // Pixels

// Initialize local player score
const mySocketId = socket.getSocketId();
if (mySocketId) {
  scoreManager.initPlayer(mySocketId, 'You');
}

// Helper function to trigger mine explosion with chain reactions - REMOVED (Server handles this)
// function triggerMineExplosion(mine: any, depth: number = 0): void { ... }

// Test bot configuration
const TEST_BOT_ENABLED = true; // Set to false to disable
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
    console.log(`💥 ${weapon.icon} LASER!`);
    weaponManager.resetToMachineGun();
    return;
  }

  // Get bullet data based on current weapon
  const bulletData = weaponManager.getBulletData(localCursor.x, localCursor.y, localCursor.rotation);
  const isRocket = weapon.type === WeaponType.ROCKET;

  // Spawn bullets locally and send to server
  bulletData.forEach(({ angle }) => {
    bullets.shoot(localCursor.x, localCursor.y, angle, socket.getSocketId() || 'local', weapon.color, isRocket);
    socket.emitBulletShoot(localCursor.x, localCursor.y, angle);
  });

  console.log(`💥 ${weapon.icon} Pew!`);

  // Reset to machine gun after using special weapon
  if (!weaponManager.isMachineGun()) {
    weaponManager.resetToMachineGun();
  }
});

// Socket event handlers
socket.onUserJoined((data) => {
  console.log(`👋 User joined: ${data.label}`);
  // User will send cursor position via cursor:update events
});

socket.onUserLeft((data) => {
  cursors.removeCursor(data.userId);
});

socket.onCursorsSync((data) => {
  cursors.syncCursors(data.cursors);
});

socket.onCursorUpdate((data) => {
  cursors.updateCursor(data.userId, data.x, data.y);
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
      bullets.shoot(remoteCursor.x, remoteCursor.y, angle, data.userId, data.color);
    }
  }
});

// Handle health updates from network
socket.onHealthUpdate((data) => {
  if (data.userId === 'local') {
    localCursor.health = data.health;
  } else {
    cursors.updateCursor(data.userId, 0, 0); // This will update health internally
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
  if (data.triggeredBy === socket.getSocketId() || data.triggeredBy === 'local') {
    announcements.announceMineExplosion('You', 0);
  }
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

// Get grid for applying forces
const grid = canvas.getGrid();

// Initialize test bot if enabled
if (TEST_BOT_ENABLED) {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const botX = centerX + Math.cos(botAngle) * botRadius;
  const botY = centerY + Math.sin(botAngle) * botRadius;

  cursors.updateCursor(botId, botX, botY, '#FF00FF', 'Bot');
  scoreManager.initPlayer(botId, 'Bot');
  console.log('🤖 Test bot initialized');
}

// Start render loop
canvas.startRenderLoop(() => {
  // Smooth follow: lerp local cursor toward target position
  const dx = targetPosition.x - localCursor.x;
  const dy = targetPosition.y - localCursor.y;

  localCursor.x += dx * followSpeed;
  localCursor.y += dy * followSpeed;

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
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
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

  // Check laser collisions - local player
  const mySocketId = socket.getSocketId();
  if (mySocketId && lasers.checkCollision(localCursor.x, localCursor.y, SHIP_COLLISION_RADIUS, mySocketId)) {
    const oldHealth = localCursor.health;
    localCursor.health = Math.max(0, localCursor.health - WEAPONS[WeaponType.LASER].damage);
    console.log(`🔥 Hit by laser! Health: ${localCursor.health}`);

    if (localCursor.health > 0) {
      particles.spawn(localCursor.x, localCursor.y, Math.random() * Math.PI * 2, '#00FF00', 5);
    }
  }

  // Check collisions - local player (use socket ID to avoid hitting yourself)
  if (mySocketId && bullets.checkCollision(localCursor.x, localCursor.y, SHIP_COLLISION_RADIUS, mySocketId)) {
    const oldHealth = localCursor.health;
    const weapon = weaponManager.getCurrentWeapon();
    localCursor.health = Math.max(0, localCursor.health - weapon.damage);
    console.log(`💥 You were hit! Health: ${localCursor.health}`);

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
      scoreManager.addPoints(mySocketId, -50);

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

      // Respawn after 3 seconds
      setTimeout(() => {
        localCursor.health = 50;
        localCursor.x = window.innerWidth / 2;
        localCursor.y = window.innerHeight / 2;
        targetPosition.x = localCursor.x;
        targetPosition.y = localCursor.y;
        console.log('✨ You respawned!');
      }, 3000);
    }
  }

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

  // Update controls (for continuous actions)
  controls.update();

  // Clean up stale cursors
  cursors.cleanupStaleCursors(5000);

  // Get rendering context
  const ctx = canvas.getCanvas().getContext('2d')!;

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

    canvas.drawCursor(localCursor.x, localCursor.y, localCursor.color, localCursor.label, localCursor.rotation, localCursor.health);
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

    canvas.drawCursor(cursor.x, cursor.y, cursor.color, cursor.label, cursor.rotation, cursor.health);
  });

  // Draw grid overlay AFTER everything to pick up glow
  canvas.drawGridOverlay();

  // Reset screen shake
  ctx.restore();

  // Render UI elements (not affected by screen shake)
  scoreManager.renderUI(ctx, socket.getSocketId() || 'local');
  announcements.render(ctx);

  // Display current weapon
  const currentWeapon = weaponManager.getCurrentWeapon();
  ctx.save();
  ctx.shadowBlur = 10;
  ctx.shadowColor = currentWeapon.color;
  ctx.fillStyle = currentWeapon.color;
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`${currentWeapon.icon} ${currentWeapon.name}`, window.innerWidth - 30, window.innerHeight - 30);
  ctx.restore();
});

// Get canvas element for mouse events
const canvasElement = canvas.getCanvas();

// Create throttled emit function (local network = much faster polling)
// 5ms = 200 updates/sec (great for local network with low latency)
const throttledEmit = throttle((x: number, y: number) => {
  socket.emitCursorMove(x, y);
}, 5);

// Track mouse movement
canvasElement.addEventListener('mousemove', (e: MouseEvent) => {
  const x = e.clientX;
  const y = e.clientY;

  // Update target position (cursor will smoothly follow)
  targetPosition.x = x;
  targetPosition.y = y;

  // Send actual cursor position to server (throttled)
  throttledEmit(localCursor.x, localCursor.y);
});

console.log('✅ App initialized - move your mouse and press SPACE to shoot!');
console.log('🎮 Controls:', controls.getBindings());
