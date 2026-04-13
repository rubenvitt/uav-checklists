import { Hono } from 'hono';
import { signerClient } from '../lib/signer-client.js';

const health = new Hono();

health.get('/', async (c) => {
  const signerOk = await signerClient.health();

  return c.json({
    status: 'ok',
    signer: signerOk,
  });
});

export default health;
