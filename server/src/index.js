import { createServer } from 'http';
import { createApp } from './app.js';
import { initializeSocket } from './socket/index.js';

const PORT = process.env.PORT || 3001;
const app = createApp();

// Create HTTP server (needed for Socket.io)
const httpServer = createServer(app);

// Initialize WebSocket server
const io = initializeSocket(httpServer);

// Make io accessible to routes (attach to app)
app.set('io', io);

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   HTTP API: http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}`);
});
