import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { createAdsbProxy, parseAdsbParams, type AdsbUpstream } from './adsb.js';
import { createApp } from './app.js';
import type { TokenVerifier } from './auth.js';
import { openDb } from './db.js';

const UPSTREAMS: AdsbUpstream[] = [
  { name: 'primary', url: (lat, lon, r) => `https://primary.test/${lat}/${lon}/${r}` },
  { name: 'fallback', url: (lat, lon, r) => `https://fallback.test/${lat}/${lon}/${r}` },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const HELI = {
  hex: '3dd2c9', flight: 'CHX4    ', r: 'D-HDRA', t: 'EC35', alt_baro: 900, alt_geom: 1100,
  gs: 110, track: 55, lat: 52.3, lon: 9.7, category: 'A7', rssi: -23, messages: 438,
};

describe('parseAdsbParams', () => {
  it('accepts valid coordinates and radius', () => {
    expect(parseAdsbParams('52.37', '9.73', '6')).toEqual({ lat: 52.37, lon: 9.73, radiusNm: 6 });
    expect(parseAdsbParams('-33.9', '-70.1', '0.5')).toEqual({ lat: -33.9, lon: -70.1, radiusNm: 0.5 });
  });

  it('rejects out-of-range or malformed values', () => {
    expect(parseAdsbParams('91', '9', '5')).toBeNull();
    expect(parseAdsbParams('52', '181', '5')).toBeNull();
    expect(parseAdsbParams('52', '9', '0')).toBeNull();
    expect(parseAdsbParams('52', '9', '26')).toBeNull();
    expect(parseAdsbParams('52', '9', '1e3')).toBeNull();
    expect(parseAdsbParams('abc', '9', '5')).toBeNull();
  });
});

describe('createAdsbProxy', () => {
  it('trims fields and drops aircraft without position', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ac: [HELI, { hex: 'abc123', flight: 'NOPOS' }] }));
    const lookup = createAdsbProxy({ upstreams: UPSTREAMS, fetchImpl: fetchImpl as unknown as typeof fetch });

    const res = await lookup(52.3701, 9.7302, 6);
    expect(res.source).toBe('primary');
    expect(res.ac).toHaveLength(1);
    expect(res.ac[0]).toMatchObject({ hex: '3dd2c9', r: 'D-HDRA', alt_geom: 1100, category: 'A7' });
    expect(res.ac[0]).not.toHaveProperty('rssi');
    expect(res.ac[0]).not.toHaveProperty('messages');
    // coordinates are rounded to ~100 m before hitting the upstream
    expect(fetchImpl).toHaveBeenCalledWith('https://primary.test/52.37/9.73/6', expect.anything());
  });

  it('falls back to the next upstream and accepts the `aircraft` key', async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      url.startsWith('https://primary.test') ? jsonResponse({ error: 'rate limited' }, 429) : jsonResponse({ aircraft: [HELI] }),
    );
    const lookup = createAdsbProxy({ upstreams: UPSTREAMS, fetchImpl: fetchImpl as unknown as typeof fetch });

    const res = await lookup(52.37, 9.73, 6);
    expect(res.source).toBe('fallback');
    expect(res.ac).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('caches per location until the TTL expires', async () => {
    let t = 1_000_000;
    const fetchImpl = vi.fn(async () => jsonResponse({ ac: [HELI] }));
    const lookup = createAdsbProxy({
      upstreams: UPSTREAMS,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      ttlMs: 15_000,
      now: () => t,
    });

    await Promise.all([lookup(52.37, 9.73, 6), lookup(52.3701, 9.7299, 6)]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    t += 16_000;
    await lookup(52.37, 9.73, 6);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not cache failures', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValue(jsonResponse({ ac: [HELI] }));
    const lookup = createAdsbProxy({ upstreams: UPSTREAMS, fetchImpl: fetchImpl as unknown as typeof fetch });

    await expect(lookup(52.37, 9.73, 6)).rejects.toThrow();
    const res = await lookup(52.37, 9.73, 6);
    expect(res.ac).toHaveLength(1);
  });
});

describe('GET /adsb/point/:lat/:lon/:radius', () => {
  const verifier: TokenVerifier = {
    async verify() {
      throw new Error('no auth in this test');
    },
  };

  function makeApp(adsb?: Parameters<typeof createApp>[0]['adsb']) {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    return createApp({
      db: openDb(':memory:'),
      verifier,
      signingKey: { privateKey, publicKey, publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString() },
      corsOrigin: 'http://localhost:5174',
      adminGroup: 'uav-admins',
      adsb,
    });
  }

  it('serves traffic without authentication', async () => {
    const adsb = vi.fn(async () => ({ source: 'primary', now: 1, ac: [{ hex: '3dd2c9' }] }));
    const res = await makeApp(adsb).request('/adsb/point/52.37/9.73/6');
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual({ source: 'primary', now: 1, ac: [{ hex: '3dd2c9' }] });
    expect(adsb).toHaveBeenCalledWith(52.37, 9.73, 6);
  });

  it('rejects invalid parameters', async () => {
    const adsb = vi.fn();
    const res = await makeApp(adsb).request('/adsb/point/52.37/9.73/100');
    expect(res.status).toBe(400);
    expect(adsb).not.toHaveBeenCalled();
  });

  it('maps upstream failure to 502', async () => {
    const res = await makeApp(async () => {
      throw new Error('down');
    }).request('/adsb/point/52.37/9.73/6');
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'upstream_unavailable' });
  });

  it('is not registered when disabled', async () => {
    const res = await makeApp().request('/adsb/point/52.37/9.73/6');
    expect(res.status).toBe(404);
  });
});
