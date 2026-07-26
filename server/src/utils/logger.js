// ─── Logger Utility ───────────────────────────────────────────────────────────
//
// A structured, console-based logger for VIDYALINK.
// Designed for single-responsibility: all log output routes through this module.
//
// Design decision: Uses console under the hood with timestamp + level prefix.
// To upgrade to Winston or Pino in the future, only this file needs to change —
// all callers remain unchanged (Open/Closed Principle).

const timestamp = () => new Date().toISOString();

const levels = {
  info:    { prefix: 'ℹ️  INFO ',    fn: console.info  },
  warn:    { prefix: '⚠️  WARN ',    fn: console.warn  },
  error:   { prefix: '❌ ERROR',    fn: console.error },
  success: { prefix: '✅ SUCCESS',  fn: console.log   },
  debug:   { prefix: '🐛 DEBUG',   fn: console.debug },
};

const createLogger = () => {
  const log = (level, message, ...meta) => {
    const { prefix, fn } = levels[level];
    const base = `[${timestamp()}] ${prefix} — ${message}`;
    if (meta.length > 0) {
      fn(base, ...meta);
    } else {
      fn(base);
    }
  };

  return {
    /**
     * Log informational messages (server start, connection events, etc.).
     * @param {string} message
     * @param {...any} meta - Optional additional data to log.
     */
    info: (message, ...meta) => log('info', message, ...meta),

    /**
     * Log non-critical warnings (deprecation notices, fallback values, etc.).
     * @param {string} message
     * @param {...any} meta
     */
    warn: (message, ...meta) => log('warn', message, ...meta),

    /**
     * Log errors (exceptions, connection failures, etc.).
     * @param {string} message
     * @param {...any} meta
     */
    error: (message, ...meta) => log('error', message, ...meta),

    /**
     * Log successful operations (DB connected, server started, etc.).
     * @param {string} message
     * @param {...any} meta
     */
    success: (message, ...meta) => log('success', message, ...meta),

    /**
     * Log debug-level messages. Intended for development only.
     * @param {string} message
     * @param {...any} meta
     */
    debug: (message, ...meta) => log('debug', message, ...meta),
  };
};

const logger = createLogger();

export default logger;
