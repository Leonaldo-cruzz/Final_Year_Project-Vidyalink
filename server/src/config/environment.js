import { env } from './env.js';

export const validateEnvironment = () => {
  if (env.NODE_ENV === 'production') {
    const weakSecrets = ['JWT_SECRET', 'JWT_REFRESH_SECRET'].filter(
      (key) => env[key] && env[key].length < 32
    );
    if (weakSecrets.length > 0) {
      throw new Error(`Production secrets must be at least 32 characters: ${weakSecrets.join(', ')}`);
    }
  }

  if (env.COOKIE_SAME_SITE && !['lax', 'strict', 'none'].includes(env.COOKIE_SAME_SITE)) {
    throw new Error('COOKIE_SAME_SITE must be one of: lax, strict, none');
  }
};

