import { Hono } from 'hono';
import { signerClient } from '../lib/signer-client.js';
import type { AppEnv } from '../lib/types.js';
import { signerError } from '../lib/errors.js';

const sign = new Hono<AppEnv>();

sign.post('/', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!(file instanceof File)) {
    return c.json({ error: 'Missing or invalid file upload' }, 400);
  }

  if (file.type !== 'application/pdf') {
    return c.json({ error: 'File must be application/pdf' }, 400);
  }

  const user = c.get('user');

  try {
    const signed = await signerClient.sign(file, user.name, user.email);

    return new Response(signed, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="signed.pdf"',
      },
    });
  } catch (err) {
    return c.json({ error: signerError(err) }, 502);
  }
});

export default sign;
