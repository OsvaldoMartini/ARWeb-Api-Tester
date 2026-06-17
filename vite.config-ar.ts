import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const host = process.env.TAURI_DEV_HOST;
const sidecarPort = process.env.SIDECAR_PORT ?? '8788';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  root: 'src-ar-web',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src-ar-web', import.meta.url)),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 5175 } : undefined,
    watch: { ignored: ['**/src/**', '**/src-arapi/**', '**/server-arapi/**'] },
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${sidecarPort}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  preview: {
    port: 4174,
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${sidecarPort}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    target: 'es2022',
    outDir: '../dist-ar',
    emptyOutDir: true,
  },
});
