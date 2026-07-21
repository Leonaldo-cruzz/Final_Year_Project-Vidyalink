const requiredVariables = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];

export const validateEnvironment = () => {
  const missing = requiredVariables.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (process.env.NODE_ENV === 'production') {
    const weakSecrets = requiredVariables.filter((name) => process.env[name].length < 32);
    if (weakSecrets.length > 0) {
      throw new Error(`Production secrets must be at least 32 characters: ${weakSecrets.join(', ')}`);
    }
  }

  if (process.env.COOKIE_SAME_SITE && !['lax', 'strict', 'none'].includes(process.env.COOKIE_SAME_SITE)) {
    throw new Error('COOKIE_SAME_SITE must be one of: lax, strict, none');
  }
};
