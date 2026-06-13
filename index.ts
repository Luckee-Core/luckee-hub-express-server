import express from 'express';
import dotenv from 'dotenv';

import { ensureSpawnHelperExecutable } from './src/utils/terminals/ensure-spawn-helper';

dotenv.config();
ensureSpawnHelperExecutable();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Early middleware setup
import { setupEarlyMiddleware } from './src/services/middleware';
setupEarlyMiddleware(app);

// Health check routes
import { createHealthRouter } from './src/services/health';
app.use('/', createHealthRouter());
app.use('/api/health', createHealthRouter());

// Dev hub services
import { createProjectsRouter } from './src/services/projects';
import { createLauncherRouter } from './src/services/launcher';
import {
  attachTerminalWebSocket,
  createTerminalsRouter,
  killAllSessions,
} from './src/services/terminals';
app.use('/api/projects', createProjectsRouter());
app.use('/api/launcher', createLauncherRouter());
app.use('/api/terminals', createTerminalsRouter());

// Error handling middleware (must be after all routes)
import { setupErrorHandling } from './src/services/middleware';
setupErrorHandling(app);

// Start server + terminal WebSocket
import { startServer } from './src/services/server';
const server = startServer(app, {
  port: PORT,
  environment: process.env.NODE_ENV || 'development',
});
attachTerminalWebSocket(server);

process.on('SIGINT', () => {
  killAllSessions();
  process.exit(0);
});
process.on('SIGTERM', () => {
  killAllSessions();
  process.exit(0);
});

export default app;
