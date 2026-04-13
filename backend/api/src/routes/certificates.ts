import { Hono } from 'hono';
import { signerClient } from '../lib/signer-client.js';
import { signerError } from '../lib/errors.js';

const certificates = new Hono();

certificates.get('/', async (c) => {
  try {
    const result = await signerClient.certificates();
    return c.json(result);
  } catch (err) {
    return c.json({ error: signerError(err) }, 502);
  }
});

export default certificates;
