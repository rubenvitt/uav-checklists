import { Hono } from 'hono';
import { signerClient } from '../lib/signer-client.js';
import { signerError } from '../lib/errors.js';

const verify = new Hono();

verify.post('/', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!(file instanceof File)) {
    return c.json({ error: 'Missing or invalid file upload' }, 400);
  }

  try {
    const result = await signerClient.verify(file);
    return c.json(result);
  } catch (err) {
    return c.json({ error: signerError(err) }, 502);
  }
});

export default verify;
