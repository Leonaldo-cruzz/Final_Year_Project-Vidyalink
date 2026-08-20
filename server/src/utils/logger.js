const REDACTED = '[REDACTED]';
const sensitiveKeyPattern = /authorization|cookie|token|secret|password|api[_-]?key|private[_-]?key|mongodb|database[_-]?url|connection[_-]?string/i;

const redactString = (value) => value
  .replace(/(mongodb(?:\+srv)?:\/\/)([^\s@/:]+)(?::[^\s@/]+)?@/gi, `$1${REDACTED}@`)
  .replace(/(bearer\s+)[A-Za-z0-9._~+\/-]+=*/gi, `$1${REDACTED}`)
  .replace(/("(?:authorization|cookie|[a-z0-9_-]*token|[a-z0-9_-]*secret|[a-z0-9_-]*password|[a-z0-9_-]*key)"\s*:\s*")[^"]*"/gi, `$1${REDACTED}"`)
  .replace(/((?:api[_-]?key|token|secret|password)\s*[=:]\s*)[^\s,;]+/gi, `$1${REDACTED}`);

/**
 * Redact credentials before they reach any log transport. Exported for tests and
 * to keep future logger integrations subject to the same safety boundary.
 */
export const redactSensitiveData = (value, seen = new WeakSet()) => {
  if (typeof value === 'string') return redactString(value);
  if (value === null || typeof value !== 'object') return value;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      ...(typeof value.statusCode === 'number' && { statusCode: value.statusCode }),
    };
  }

  if (seen.has(value)) return '[CIRCULAR]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item, seen));
  }

  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    sensitiveKeyPattern.test(key) ? REDACTED : redactSensitiveData(item, seen),
  ]));
};

const timestamp = () => new Date().toISOString();

const levelDefinitions = {
  info: { prefix: 'INFO', writer: 'info' },
  warn: { prefix: 'WARN', writer: 'warn' },
  error: { prefix: 'ERROR', writer: 'error' },
  success: { prefix: 'SUCCESS', writer: 'log' },
  debug: { prefix: 'DEBUG', writer: 'debug' },
};

export const createLogger = (writers = console) => {
  const log = (level, message, ...meta) => {
    const { prefix, writer } = levelDefinitions[level];
    const output = writers[writer] || writers.log;
    const base = `[${timestamp()}] ${prefix} — ${redactSensitiveData(String(message))}`;
    output(base, ...meta.map((item) => redactSensitiveData(item)));
  };

  return Object.freeze({
    info: (message, ...meta) => log('info', message, ...meta),
    warn: (message, ...meta) => log('warn', message, ...meta),
    error: (message, ...meta) => log('error', message, ...meta),
    success: (message, ...meta) => log('success', message, ...meta),
    debug: (message, ...meta) => log('debug', message, ...meta),
  });
};

export default createLogger();
