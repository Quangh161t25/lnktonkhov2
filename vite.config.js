import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import sheetsHandler from './api/sheets.js';

function localApiPlugin() {
  return {
    name: 'local-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && (req.url.startsWith('/api/sheets') || req.url === '/api/sheets')) {
          let body = null;
          if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            const buffers = [];
            for await (const chunk of req) {
              buffers.push(chunk);
            }
            const raw = Buffer.concat(buffers).toString();
            try {
              body = JSON.parse(raw);
            } catch (e) {
              body = raw;
            }
          }
          req.body = body;

          // Polyfill status and json for Connect middleware
          if (!res.status) {
            res.status = function(code) {
              this.statusCode = code;
              return this;
            };
          }
          if (!res.json) {
            res.json = function(obj) {
              this.setHeader('Content-Type', 'application/json');
              this.end(JSON.stringify(obj));
              return this;
            };
          }

          try {
            await sheetsHandler(req, res);
          } catch (err) {
            console.error('Local API Handler Error:', err);
            res.status(500).json({ success: false, error: err.message });
          }
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), localApiPlugin()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
