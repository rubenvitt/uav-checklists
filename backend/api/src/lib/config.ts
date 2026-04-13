export const config = {
  PORT: parseInt(process.env.API_PORT ?? '3001', 10),
  SIGNER_URL: process.env.SIGNER_URL ?? 'http://signer:8000',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  OIDC_ISSUER: process.env.OIDC_ISSUER ?? '',
  OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID ?? '',
};
