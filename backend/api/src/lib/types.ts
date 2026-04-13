import type { Env } from 'hono';

export type User = { name: string; email: string };

export type AppEnv = Env & {
  Variables: {
    user: User;
  };
};
