/**
 * Start Server
 * Initializes and starts the Express server
 */

import http from 'http';
import { Express } from 'express';

type ServerConfig = {
  port: number;
  environment: string;
};

/**
 * Initializes and starts the Express server bound to 127.0.0.1.
 */
export const startServer = (app: Express, config: ServerConfig): http.Server => {
  const { port, environment } = config;

  const server = http.createServer(app);

  server.listen(port, '127.0.0.1', () => {
    console.log('');
    console.log('='.repeat(50));
    console.log(`🚀 Luckee Hub Express Server`);
    console.log('='.repeat(50));
    console.log(`Environment: ${environment}`);
    console.log(`Port: ${port}`);
    console.log(`URL: http://127.0.0.1:${port}`);
    console.log(`Health Check: http://127.0.0.1:${port}/api/health`);
    console.log('='.repeat(50));
    console.log('');
  });

  return server;
};
