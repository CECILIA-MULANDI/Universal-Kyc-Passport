import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

// Plugin to handle WASM files correctly
function wasmPlugin(): Plugin {
  return {
    name: 'wasm-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    wasmPlugin(),
  ],
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    fs: {
      allow: ['..'],
    },
  },
  optimizeDeps: {
    exclude: [
      '@noir-lang/backend_barretenberg',
      '@noir-lang/noir_js',
      '@noir-lang/noirc_abi',
    ],
  },
  assetsInclude: ['**/*.wasm'],
  worker: {
    format: 'es',
  },
})