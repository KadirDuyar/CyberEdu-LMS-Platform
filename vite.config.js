import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Yerel ortam değişkenlerini oku (.env.local, .env)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'local-api-ai-middleware',
        configureServer(server) {
          // Yerel geliştirme ortamında /api/ai uç noktasına gelen istekleri karşıla
          server.middlewares.use('/api/ai', async (req, res, next) => {
            if (req.method === 'OPTIONS') {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.statusCode = 200;
              return res.end();
            }

            if (req.method !== 'POST') {
              return next();
            }

            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });

            req.on('end', async () => {
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');

              try {
                const parsed = JSON.parse(body || '{}');
                const { handleAIRequest } = await import('./api/_aiHandler.js');
                const result = await handleAIRequest(parsed, env);
                res.statusCode = 200;
                res.end(JSON.stringify(result));
              } catch (err) {
                console.error('[Vite Dev AI Middleware Hatası]:', err.message);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message || 'Yerel AI servisi hatası' }));
              }
            });
          });
        }
      }
    ],
  };
});
