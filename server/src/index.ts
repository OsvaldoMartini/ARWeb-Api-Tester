import { buildContainer } from './bootstrap/container.js';
import { createSidecarServer } from './server.js';

/**
 * Node sidecar entry point. Started automatically by the Tauri shell (or via
 * `npm run dev:sidecar` in development). Listens on 127.0.0.1 only.
 */
const ctx = buildContainer();
const server = createSidecarServer(ctx);

const sidecarHost = process.env['SIDECAR_HOST'] ?? '127.0.0.1';
server.listen(ctx.config.sidecarPort, sidecarHost, () => {
  ctx.logger.info('ARWEB sidecar listening', { port: ctx.config.sidecarPort, host: sidecarHost });
});

const shutdown = async (signal: string) => {
  ctx.logger.info('Shutting down sidecar', { signal });
  await ctx.mockServer.stop();
  server.close(() => process.exit(0));
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
