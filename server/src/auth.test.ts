import { describe, expect, it, vi } from 'vitest';
import {
  adminOnly,
  isAdmin,
  resolveUserinfoName,
  withUserinfo,
  type AuthenticatedUser,
  type TokenVerifier,
} from './auth.js';

/** A trivial inner verifier that returns a fixed sub regardless of token. */
function fakeBase(sub: string): TokenVerifier {
  return {
    async verify(): Promise<AuthenticatedUser> {
      return { sub, name: sub, groups: [] };
    },
  };
}

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as unknown as Response;
}

describe('resolveUserinfoName', () => {
  it('prefers name', () => {
    expect(
      resolveUserinfoName(
        { name: 'Max Muster', given_name: 'Max', family_name: 'Muster', preferred_username: 'mm' },
        'sub-1',
      ),
    ).toBe('Max Muster');
  });

  it('falls back to given + family name', () => {
    expect(
      resolveUserinfoName({ given_name: 'Max', family_name: 'Muster', preferred_username: 'mm' }, 'sub-1'),
    ).toBe('Max Muster');
  });

  it('requires BOTH given and family before using them', () => {
    expect(resolveUserinfoName({ given_name: 'Max', preferred_username: 'mm' }, 'sub-1')).toBe('mm');
  });

  it('falls back to preferred_username then email then sub', () => {
    expect(resolveUserinfoName({ preferred_username: 'mm' }, 'sub-1')).toBe('mm');
    expect(resolveUserinfoName({ email: 'a@b.de' }, 'sub-1')).toBe('a@b.de');
    expect(resolveUserinfoName({}, 'sub-1')).toBe('sub-1');
  });
});

describe('withUserinfo', () => {
  it('resolves the real name + groups from userinfo and binds the bearer token', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ name: 'Max Muster', groups: ['uav-admins', 'pilots'] }),
    );
    const verifier = withUserinfo(fakeBase('sub-uuid'), {
      userinfoUrl: 'https://id.test/api/oidc/userinfo',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const user = await verifier.verify('tok-1');

    expect(user).toEqual({
      sub: 'sub-uuid',
      name: 'Max Muster',
      groups: ['uav-admins', 'pilots'],
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://id.test/api/oidc/userinfo');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer tok-1' });
  });

  it('caches by token so userinfo is only called once within the TTL', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ name: 'Cached User', groups: [] }));
    const verifier = withUserinfo(fakeBase('sub-uuid'), {
      userinfoUrl: 'https://id.test/userinfo',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const a = await verifier.verify('same-token');
    const b = await verifier.verify('same-token');

    expect(a).toEqual(b);
    expect(a.name).toBe('Cached User');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('falls back to sub + empty groups when userinfo fails', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down');
    });
    const verifier = withUserinfo(fakeBase('sub-uuid'), {
      userinfoUrl: 'https://id.test/userinfo',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const user = await verifier.verify('tok');
    expect(user).toEqual({ sub: 'sub-uuid', name: 'sub-uuid', groups: [] });
  });

  it('falls back when userinfo returns a non-ok response', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, false));
    const verifier = withUserinfo(fakeBase('sub-uuid'), {
      userinfoUrl: 'https://id.test/userinfo',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const user = await verifier.verify('tok');
    expect(user).toEqual({ sub: 'sub-uuid', name: 'sub-uuid', groups: [] });
  });

  it('re-validates the JWT on every request even with a warm userinfo cache', async () => {
    // Base verifier that succeeds the first time, then rejects (token expired).
    let calls = 0;
    const base: TokenVerifier = {
      async verify(): Promise<AuthenticatedUser> {
        calls += 1;
        if (calls === 1) return { sub: 'sub-uuid', name: 'sub-uuid', groups: [] };
        throw new Error('token expired');
      },
    };
    const fetchImpl = vi.fn(async () => jsonResponse({ name: 'Max', groups: [] }));
    const verifier = withUserinfo(base, {
      userinfoUrl: 'https://id.test/userinfo',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    // First call warms the cache.
    await verifier.verify('tok');
    // Second call must reject because the JWT no longer validates, despite the
    // cached userinfo enrichment.
    await expect(verifier.verify('tok')).rejects.toThrow('token expired');
  });

  it('does not cache userinfo failures (retries next request)', async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(async () => {
        throw new Error('blip');
      })
      .mockImplementationOnce(async () => jsonResponse({ name: 'Recovered', groups: ['g'] }));
    const verifier = withUserinfo(fakeBase('sub-uuid'), {
      userinfoUrl: 'https://id.test/userinfo',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const first = await verifier.verify('tok');
    expect(first).toEqual({ sub: 'sub-uuid', name: 'sub-uuid', groups: [] });

    const second = await verifier.verify('tok');
    expect(second).toEqual({ sub: 'sub-uuid', name: 'Recovered', groups: ['g'] });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('re-fetches after the TTL expires', async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi.fn(async () => jsonResponse({ name: 'Fresh', groups: [] }));
      const verifier = withUserinfo(fakeBase('sub-uuid'), {
        userinfoUrl: 'https://id.test/userinfo',
        ttlMs: 1000,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });

      await verifier.verify('tok');
      vi.advanceTimersByTime(1500);
      await verifier.verify('tok');

      expect(fetchImpl).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('isAdmin', () => {
  const user = (groups: string[]): AuthenticatedUser => ({ sub: 's', name: 'n', groups });

  it('is true only when the admin group is present', () => {
    expect(isAdmin(user(['uav-admins']), 'uav-admins')).toBe(true);
    expect(isAdmin(user(['pilots']), 'uav-admins')).toBe(false);
    expect(isAdmin(user([]), 'uav-admins')).toBe(false);
  });
});

describe('adminOnly middleware', () => {
  function ctx(user: AuthenticatedUser | undefined) {
    return {
      get: () => user,
      json: (body: unknown, status?: number) => ({ body, status: status ?? 200 }),
    };
  }

  it('403s a non-admin', async () => {
    const mw = adminOnly('uav-admins');
    const next = vi.fn(async () => {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = (await mw(ctx({ sub: 's', name: 'n', groups: [] }) as any, next)) as any;
    expect(res.status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('passes an admin through', async () => {
    const mw = adminOnly('uav-admins');
    const next = vi.fn(async () => {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await mw(ctx({ sub: 's', name: 'n', groups: ['uav-admins'] }) as any, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
