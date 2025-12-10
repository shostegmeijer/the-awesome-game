import { CanvasManager } from './canvas.js';
import { SocketManager } from './socket.js';
import { CursorManager } from './cursor.js';
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

// Track local cursor position (bright cyan for visibility)
let localCursor = { x: 0, y: 0, rotation: 0, color: '#00FFFF', label: 'You' };
let targetPosition = { x: 0, y: 0 }; // Mouse target position
const followSpeed = 0.08; // Lower = more lag, higher = more responsive (increased delay)
const rotationSpeed = 0.1; // Smooth rotation interpolation

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

  // Clean up stale cursors
  cursors.cleanupStaleCursors(5000);

  // Render local cursor (your own) with rotation
  canvas.drawCursor(localCursor.x, localCursor.y, localCursor.color, localCursor.label, localCursor.rotation);

  // Render all remote cursors
  cursors.getCursors().forEach((cursor) => {
    canvas.drawCursor(cursor.x, cursor.y, cursor.color, cursor.label);
  });
});

// Get canvas element for mouse events
const canvasElement = canvas.getCanvas();

// Create throttled emit function (60fps = ~16.6ms)
const throttledEmit = throttle((x: number, y: number) => {
  socket.emitCursorMove(x, y);
}, 16);

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

console.log('✅ App initialized - move your mouse!');
