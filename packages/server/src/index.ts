import type { ClientToServerEvents, ServerToClientEvents } from '@awesome-game/shared';
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { initializeSocketHandlers } from './socket.js';

// --- Simple Admin Auth and API ---
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

const app = express();
app.use(express.json());
const server = createServer(app);

// Initialize Socket.io with type safety and CORS
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*', // Allow all origins on local network
    methods: ['GET', 'POST']
  }
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    users: io.sockets.sockets.size,
    timestamp: new Date().toISOString()
  });
});

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';
  if (token && token === ADMIN_PASSWORD) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

app.post('/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) {
    // For simplicity, use the password itself as token
    return res.json({ token: ADMIN_PASSWORD });
  }
  res.status(403).json({ error: 'Invalid password' });
});

import { addBot, getAllBots, getAllUsers, removeBot } from './state.js';

app.get('/admin/players', authMiddleware, (_req, res) => {
  const users = Array.from(getAllUsers().values()).map(u => ({
    id: u.id,
    label: u.label,
    x: u.x,
    y: u.y,
    health: u.health,
    points: u.points
  }));
  res.json({ players: users });
});

app.get('/admin/bots', authMiddleware, (_req, res) => {
  res.json({ bots: getAllBots() });
});

app.post('/admin/bots/add', authMiddleware, (_req, res) => {
  const bot = addBot();
  res.json({ bot });
});

app.post('/admin/bots/remove', authMiddleware, (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id required' });
  const ok = removeBot(id);
  if (!ok) return res.status(404).json({ error: 'bot not found' });
  res.json({ removed: id });
});

// Serve a lightweight admin panel
// Resolve dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get('/admin', (_req, res) => {
  res.sendFile(path.resolve(__dirname, '../admin/index.html'));
});

// Initialize Socket.io event handlers
initializeSocketHandlers(io);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔐 Admin: http://localhost:${PORT}/admin`);
});
