import { config } from './config.js';

export class SignerClient {
  private baseUrl: string;

  constructor(baseUrl = config.SIGNER_URL) {
    this.baseUrl = baseUrl;
  }

  async sign(
    file: Blob,
    signerName: string,
    signerEmail: string,
  ): Promise<ArrayBuffer> {
    const form = new FormData();
    form.append('file', file);

    const res = await fetch(`${this.baseUrl}/sign`, {
      method: 'POST',
      body: form,
      headers: {
        'X-Signer-Name': signerName,
        'X-Signer-Email': signerEmail,
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      throw new Error(`Signer returned ${res.status}: ${await res.text()}`);
    }

    return res.arrayBuffer();
  }

  async verify(file: Blob): Promise<unknown> {
    const form = new FormData();
    form.append('file', file);

    const res = await fetch(`${this.baseUrl}/verify`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      throw new Error(`Signer returned ${res.status}: ${await res.text()}`);
    }

    return res.json();
  }

  async certificates(): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}/certificates`, {
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      throw new Error(`Signer returned ${res.status}: ${await res.text()}`);
    }

    return res.json();
  }

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(5_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const signerClient = new SignerClient();
