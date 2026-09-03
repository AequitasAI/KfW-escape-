import { createServer } from 'node:http';
import { config } from './config.js';
import { openDatabase } from './db.js';
import { createHttpApp } from './http.js';
import { log } from './logger.js';
import { SessionManager } from './sessionManager.js';
import { createSocketServer } from './socket.js';

const db = openDatabase();
const manager = new SessionManager(db);
const app = createHttpApp(manager);
const httpServer = createServer(app);
createSocketServer(httpServer, manager);

manager.start();
const sweeper = setInterval(() => manager.sweep(), 15 * 60 * 1000);
sweeper.unref?.();

httpServer.listen(config.port, () => {
  log.info('server.listening', {
    port: config.port,
    env: config.nodeEnv,
    publicBaseUrl: config.publicBaseUrl || '(request host)',
  });
});

function shutdown(signal: string): void {
  log.info('server.shutdown', { signal });
  manager.stop();
  httpServer.close(() => {
    db.close();
    process.exit(0);
  });
  // do not hang forever on lingering websockets
  setTimeout(() => process.exit(0), 5_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
