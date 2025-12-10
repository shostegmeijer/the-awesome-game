import { CanvasManager } from './canvas.js';
import { SocketManager } from './socket.js';
import { CursorManager } from './cursor.js';
import './styles.css';

console.log('🎮 Initializing multiplayer cursor game...');

// Initialize canvas
const canvas = new CanvasManager('game-canvas');

// Initialize socket connection
const socket = new SocketManager('http://localhost:3000');

// Initialize cursor manager
const cursors = new CursorManager();

// Track local cursor position
let localCursor = { x: 0, y: 0, color: '#00FF00', label: 'You' };

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
  // Clean up stale cursors
  cursors.cleanupStaleCursors(5000);

  // Render local cursor (your own)
  canvas.drawCursor(localCursor.x, localCursor.y, localCursor.color, localCursor.label);

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

  // Update local cursor position immediately
  localCursor.x = x;
  localCursor.y = y;

  // Send to server (throttled)
  throttledEmit(x, y);
});

console.log('✅ App initialized - move your mouse!');
