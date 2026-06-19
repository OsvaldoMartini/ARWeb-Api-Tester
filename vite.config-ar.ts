import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const host = process.env.TAURI_DEV_HOST;
const sidecarPort = process.env.ARAPI_PORT ?? process.env.SIDECAR_PORT ?? '8787';
const rootNodeModules = fileURLToPath(new URL('./node_modules', import.meta.url));

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  root: 'src-ar-web',
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
    alias: {
      '@': fileURLToPath(new URL('./src-ar-web', import.meta.url)),
      react: fileURLToPath(new URL('./node_modules/react', import.meta.url)),
      'react-dom': fileURLToPath(new URL('./node_modules/react-dom', import.meta.url)),
      'react-router': fileURLToPath(new URL('./node_modules/react-router', import.meta.url)),
      'react-router-dom': fileURLToPath(new URL('./node_modules/react-router-dom', import.meta.url)),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom/client', 'react-router', 'react-router-dom'],
    entries: ['src-ar-web/index.html', 'src-ar-web/main.tsx'],
    force: true,
  },
  server: {
    port: 5174,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 5175 } : undefined,
    watch: { ignored: ['**/src/**', '**/src-arapi/**', '**/server-ar/**'] },
    fs: {
      allow: [fileURLToPath(new URL('.', import.meta.url)), rootNodeModules],
    },
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
