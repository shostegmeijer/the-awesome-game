# 🎮 The Awesome Game - Multiplayer Cursor Sharing

A real-time multiplayer mini game where users can see each other's cursors on a shared canvas using WebSockets.

## ✨ Features

- 🖱️ **Real-time cursor sharing** - See other players' cursors in real-time
- 🎨 **Color-coded cursors** - Each user gets a unique color and label
- ⚡ **High performance** - 60fps rendering with requestAnimationFrame
- 🔄 **Smooth animations** - Cursor interpolation for smooth movement
- 📡 **WebSocket communication** - Low-latency Socket.io for real-time updates
- 🧹 **Auto cleanup** - Stale cursors removed automatically
- 📊 **Connection status** - Visual indicator for connection state

## 🛠️ Tech Stack

- **Frontend**: Vanilla TypeScript + Vite
- **Backend**: Express + Socket.io (TypeScript)
- **Architecture**: npm workspaces monorepo

## 📦 Installation

```bash
# Install all dependencies
npm install
```

## 🚀 Running the Game

You need to run both the server and client in separate terminals:

### Terminal 1: Start the server
```bash
npm run dev:server
```

The server will start on `http://localhost:3000`

### Terminal 2: Start the client
```bash
npm run dev:client
```

The client will start on `http://localhost:5173`

## 🎮 How to Play

1. Open `http://localhost:5173` in multiple browser windows or tabs
2. Move your mouse around in any window
3. Watch as your cursor appears in all other windows in real-time!

## 📁 Project Structure

```
the-awesome-game/
├── packages/
│   ├── shared/          # Shared TypeScript types
│   │   └── src/
│   │       └── types.ts # Socket.io event interfaces
│   │
│   ├── server/          # Express + Socket.io backend
│   │   └── src/
│   │       ├── index.ts  # Server entry point
│   │       ├── socket.ts # Socket.io event handlers
│   │       └── state.ts  # User state management
│   │
│   └── client/          # Vite frontend
│       └── src/
│           ├── main.ts   # Client entry point
│           ├── canvas.ts # Canvas rendering
│           ├── socket.ts # Socket.io client wrapper
│           ├── cursor.ts # Cursor state management
│           └── styles.css
│
├── package.json         # Root workspace config
└── tsconfig.json        # TypeScript configuration
```

## 🔧 Development

### Type checking
```bash
npm run typecheck
```

### Build for production
```bash
npm run build
```

## 🎯 How It Works

### Architecture

1. **Client** - Captures mouse movement and sends cursor positions to server
2. **Server** - Broadcasts cursor positions to all connected clients
3. **Rendering** - Each client renders all remote cursors at 60fps

### Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `cursor:move` | Client → Server | User's cursor position (volatile, 60fps) |
| `user:joined` | Server → Client | New user connected |
| `user:left` | Server → Client | User disconnected |
| `cursors:sync` | Server → Client | Initial state on connection |
| `cursor:update` | Server → Client | Another user moved (volatile) |

### Performance Optimizations

- **Throttling**: Mouse events throttled to 60fps (16ms)
- **Volatile emits**: Cursor positions use volatile mode for speed over reliability
- **Interpolation**: Smooth cursor movement using linear interpolation
- **requestAnimationFrame**: Efficient rendering loop synchronized with browser
- **Stale cleanup**: Automatic removal of inactive cursors after 5 seconds

## 🌟 Future Enhancements

- [ ] Add username customization
- [ ] Add chat functionality
- [ ] Add drawing/painting features
- [ ] Add game modes (tag, drawing games, etc.)
- [ ] Add Redis adapter for horizontal scaling
- [ ] Add authentication
- [ ] Add persistence (save drawings)

## 📝 License

MIT

---

Built with ❤️ using TypeScript, Vite, Express, and Socket.io
