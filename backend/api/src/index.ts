import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { config } from './lib/config.js';
import { authMiddleware } from './middleware/auth.js';
import sign from './routes/sign.js';
import verify from './routes/verify.js';
import certificates from './routes/certificates.js';
import health from './routes/health.js';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({ origin: config.CORS_ORIGIN }));

// Health check (no auth)
app.route('/health', health);

// Authenticated API routes
app.use('/api/*', authMiddleware);
app.route('/api/v1/sign', sign);
app.route('/api/v1/verify', verify);
app.route('/api/v1/certificates', certificates);

serve({ fetch: app.fetch, port: config.PORT }, () => {
  console.log(`API gateway listening on port ${config.PORT}`);
});
