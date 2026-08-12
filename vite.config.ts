import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite plugin to receive POST /api/add-stat from Python and stream to Web browser via SSE
function aiStatReceiverPlugin(): Plugin {
  const clients = new Set<any>();

  return {
    name: 'ai-stat-receiver',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        // SSE connection endpoint for browser Web UI
        if (req.method === 'GET' && (req.url === '/api/ai-events-stream' || req.url?.startsWith('/api/ai-events-stream'))) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          });
          res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'SSE Stream active' })}\n\n`);

          clients.add(res);
          req.on('close', () => {
            clients.delete(res);
          });
          return;
        }

        // POST /api/add-stat from Python AI
        if (req.method === 'POST' && (req.url === '/api/add-stat' || req.url === '/add-stat')) {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              console.log('📡 [Vite Web Receiver] Received from Python:', data);

              const payload = {
                ...data,
                receivedAt: new Date().toISOString()
              };

              // Broadcast to all connected Web browser clients
              const msg = `data: ${JSON.stringify({ type: 'AI_STAT', data: payload })}\n\n`;
              clients.forEach(client => {
                try { client.write(msg); } catch (_) { clients.delete(client); }
              });

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                status: 'success',
                message: 'Data broadcasted to web clients',
                activeClients: clients.size,
                received: data
              }));
            } catch (err: any) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ status: 'error', message: err.message }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');

  if (command === 'build') {
    const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn(
        '\n⚠️ [Vite Build Warning] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing in build environment!\n' +
        'Please ensure these environment variables are set in your Vercel Project Settings -> Environment Variables.\n'
      );
    }
  }

  return {
    base: './',
    plugins: [react(), tailwindcss(), aiStatReceiverPlugin()],
  };
});
