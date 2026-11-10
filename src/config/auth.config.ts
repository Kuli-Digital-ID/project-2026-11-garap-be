import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  passwordLogin: process.env.AUTH_PASSWORD_LOGIN === 'true',
  keycloak: {
    issuer: (process.env.KEYCLOAK_ISSUER || '').replace(/\/$/, ''),
    clientId: process.env.KEYCLOAK_CLIENT_ID || '',
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || '',
    redirectUri: process.env.KEYCLOAK_REDIRECT_URI || '',
  },
}));
