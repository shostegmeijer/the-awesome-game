import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '@awesome-game/shared';
import { initializeSocketHandlers } from './socket.js';

const app = express();
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

// Initialize Socket.io event handlers
initializeSocketHandlers(io);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
