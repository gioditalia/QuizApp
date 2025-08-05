import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import setupSocket from './socket';
import apiRoutes from './routes/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { 
    origin: '*',
    methods: ['GET', 'POST']
  } 
});

app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ success: true,
    data: {
      status: 'OK', 
      timestamp: new Date().toISOString()
    } });
});

// Serve index.html for all other routes (SPA support)
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Setup WebSocket
setupSocket(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready`);
});
