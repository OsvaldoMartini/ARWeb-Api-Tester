import { buildContainer } from './bootstrap/container.js';
import { createSidecarServer } from './server.js';

/**
 * Node sidecar entry point. Started automatically by the Tauri shell (or via
 * `npm run dev:sidecar` in development). Listens on 127.0.0.1 only.
 */
const ctx = buildContainer();
const server = createSidecarServer(ctx);

server.listen(ctx.config.sidecarPort, '127.0.0.1', () => {
  ctx.logger.info('ARWEB sidecar listening', { port: ctx.config.sidecarPort });
});

const shutdown = async (signal: string) => {
  ctx.logger.info('Shutting down sidecar', { signal });
  await ctx.mockServer.stop();
  server.close(() => process.exit(0));
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
