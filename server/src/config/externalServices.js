import { env } from './env.js';

// Only GitHub has an active client today. Other optional provider credentials
// remain server-only values in env until a corresponding client is introduced.
export const externalServices = Object.freeze({
  github: Object.freeze({
    token: env.github.token,
    clientId: env.github.clientId,
    clientSecret: env.github.clientSecret,
    apiBaseUrl: env.github.apiBaseUrl,
    requestTimeoutMs: env.github.requestTimeoutMs,
  }),
});

export default externalServices;
