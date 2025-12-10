import { CanvasManager } from './canvas.js';
import { SocketManager } from './socket.js';
import { CursorManager } from './cursor.js';
import { ParticleSystem } from './particles.js';
import { BulletSystem } from './bullets.js';
import { ControlsManager } from './controls.js';
import { ExplosionSystem } from './explosions.js';
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

// Track local cursor position (bright cyan for visibility)
let localCursor = { x: 0, y: 0, rotation: 0, health: 100, color: '#00FFFF', label: 'You' };
let targetPosition = { x: 0, y: 0 }; // Mouse target position
const followSpeed = 0.08; // Lower = more lag, higher = more responsive (increased delay)
const rotationSpeed = 0.1; // Smooth rotation interpolation

// Shooting rate limiting
let lastShotTime = 0;
const shootCooldown = 150; // Milliseconds between shots (6-7 shots per second)

// Collision settings
const SHIP_COLLISION_RADIUS = 25; // Pixels
const BULLET_DAMAGE = 10; // Damage per hit

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

// Set up controls - shoot on every press
controls.onAction('shoot', () => {
  // Only send to server - server will broadcast back to everyone including us
  socket.emitBulletShoot(localCursor.x, localCursor.y, localCursor.rotation);
  console.log('💥 Pew!');
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

// Get grid for applying forces
const grid = canvas.getGrid();

// Initialize test bot if enabled
if (TEST_BOT_ENABLED) {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const botX = centerX + Math.cos(botAngle) * botRadius;
  const botY = centerY + Math.sin(botAngle) * botRadius;

  cursors.updateCursor(botId, botX, botY, '#FF00FF', 'Bot');
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

  // Check collisions - local player (use socket ID to avoid hitting yourself)
  const mySocketId = socket.getSocketId();
  if (mySocketId && bullets.checkCollision(localCursor.x, localCursor.y, SHIP_COLLISION_RADIUS, mySocketId)) {
    const oldHealth = localCursor.health;
    localCursor.health = Math.max(0, localCursor.health - BULLET_DAMAGE);
    console.log(`💥 You were hit! Health: ${localCursor.health}`);

    // Death explosion!
    if (oldHealth > 0 && localCursor.health <= 0) {
      console.log('💀 You died!');
      explosions.explode(localCursor.x, localCursor.y, localCursor.color, 4);
      particles.explode(localCursor.x, localCursor.y, localCursor.color, 1000); // WAY more particles!

      // MASSIVE grid explosion shockwave - multiple rings at different radii
      const explosionForce = 100; // MUCH stronger force
      const rings = 5; // Multiple shockwave rings
      for (let ring = 0; ring < rings; ring++) {
        const ringRadius = ring * 30; // 0, 30, 60, 90, 120 pixels
        for (let angle = 0; angle < Math.PI * 2; angle += 0.1) { // More force points
          const forceX = Math.cos(angle) * explosionForce;
          const forceY = Math.sin(angle) * explosionForce;
          const x = localCursor.x + Math.cos(angle) * ringRadius;
          const y = localCursor.y + Math.sin(angle) * ringRadius;
          grid.applyForce(x, y, forceX, forceY);
        }
      }

      // Respawn after 10 seconds
      setTimeout(() => {
        localCursor.health = 100;
        localCursor.x = window.innerWidth / 2;
        localCursor.y = window.innerHeight / 2;
        targetPosition.x = localCursor.x;
        targetPosition.y = localCursor.y;
        console.log('✨ You respawned!');
      }, 10000);
    }
  }

  // Check collisions - remote players
  cursors.getCursors().forEach((cursor, userId) => {
    if (bullets.checkCollision(cursor.x, cursor.y, SHIP_COLLISION_RADIUS, userId)) {
      const oldHealth = cursor.health;
      const isDead = cursors.damageCursor(userId, BULLET_DAMAGE);

      // Death explosion for remote players!
      if (isDead && oldHealth > 0) {
        console.log(`💀 ${cursor.label} died!`);
        explosions.explode(cursor.x, cursor.y, cursor.color, 4);
        particles.explode(cursor.x, cursor.y, cursor.color, 1000); // WAY more particles!

        // MASSIVE grid explosion shockwave - multiple rings at different radii
        const explosionForce = 100; // MUCH stronger force
        const rings = 5; // Multiple shockwave rings
        for (let ring = 0; ring < rings; ring++) {
          const ringRadius = ring * 30; // 0, 30, 60, 90, 120 pixels
          for (let angle = 0; angle < Math.PI * 2; angle += 0.1) { // More force points
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
          // Respawn bot after 10 seconds
          setTimeout(() => {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            botAngle = Math.random() * Math.PI * 2; // Random starting position
            const botX = centerX + Math.cos(botAngle) * botRadius;
            const botY = centerY + Math.sin(botAngle) * botRadius;
            cursors.updateCursor(botId, botX, botY, '#FF00FF', 'Bot');
            console.log('🤖 Bot respawned!');
          }, 10000);
        }
      }
    }
  });

  // Update controls (for continuous actions)
  controls.update();

  // Clean up stale cursors
  cursors.cleanupStaleCursors(5000);

  // Render particles first (so they appear behind cursors)
  const ctx = canvas.getCanvas().getContext('2d')!;
  particles.render(ctx);

  // Render explosion rings
  explosions.render(ctx);

  // Render bullets
  bullets.render(ctx);

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
