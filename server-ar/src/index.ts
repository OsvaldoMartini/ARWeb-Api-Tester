import { buildContainer } from './bootstrap/container.js';
import { createSidecarServer } from './server.js';

const ctx = buildContainer();
const server = createSidecarServer(ctx);

const sidecarHost = process.env['SIDECAR_HOST'] ?? '127.0.0.1';
server.listen(ctx.config.sidecarPort, sidecarHost, () => {
  ctx.logger.info('AR Conversational sidecar listening', { port: ctx.config.sidecarPort, host: sidecarHost });
});

const shutdown = (signal: string) => {
  ctx.logger.info('Shutting down sidecar', { signal });
  server.close(() => process.exit(0));
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
