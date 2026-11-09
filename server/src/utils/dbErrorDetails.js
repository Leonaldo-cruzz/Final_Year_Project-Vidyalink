// ─── Database Error Details ───────────────────────────────────────────────────
//
// Turns a MongoDB / Mongoose error into a detailed, log-safe description.
//
// The raw driver message is the most useful thing to log ("bad auth",
// "querySrv ENOTFOUND", "connection timed out", ...), but it can also contain
// the connection string and credentials. Everything that goes through here is
// passed through a redactor first, so the details are revealing without ever
// printing a username, password or full MONGODB_URI.

const MONGO_URI_PATTERN = /mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi;
const SECRET_PARAM_PATTERN = /\b(password|pwd|pass|secret|token|apikey|api_key)=([^&\s"']+)/gi;

const safeDecode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/**
 * Returns only the host part of a MongoDB URI (no scheme, credentials, path or query),
 * e.g. "cluster0.abcde.mongodb.net". Useful for telling which cluster failed.
 */
/**
 * Splits a MongoDB URI into credentials and host. Uses the LAST "@" so that an
 * un-encoded "@" inside the password (a common misconfiguration) never leaks
 * part of the password into the "host".
 */
const splitMongoUri = (uri) => {
  if (typeof uri !== 'string') return null;
  const scheme = uri.match(/^mongodb(?:\+srv)?:\/\//i)?.[0];
  if (!scheme) return null;
  const rest = uri.slice(scheme.length);
  const at = rest.lastIndexOf('@');
  const credentials = at >= 0 ? rest.slice(0, at) : '';
  const afterCredentials = at >= 0 ? rest.slice(at + 1) : rest;
  const host = afterCredentials.split(/[/?#]/)[0] || null;
  return { credentials, host };
};

export const extractMongoHost = (uri) => splitMongoUri(uri)?.host || null;

/**
 * Builds a function that strips secrets from any string:
 *   - the exact URI and the username/password parsed from it (plain and URL-decoded)
 *   - any other mongodb:// or mongodb+srv:// URI (kept as host only)
 *   - password=/secret=/token= style query parameters
 */
export const createRedactor = (uri) => {
  const secrets = new Set();

  if (typeof uri === 'string' && uri.length > 0) {
    secrets.add(uri);
    const credentials = splitMongoUri(uri)?.credentials;
    if (credentials) {
      const separator = credentials.indexOf(':');
      const user = separator >= 0 ? credentials.slice(0, separator) : credentials;
      const pass = separator >= 0 ? credentials.slice(separator + 1) : '';
      [credentials, user, pass].filter(Boolean).forEach((part) => {
        secrets.add(part);
        secrets.add(safeDecode(part));
      });
    }
  }

  // Longest first so the full URI is replaced before its fragments.
  const orderedSecrets = [...secrets].filter((s) => s.length >= 3).sort((a, b) => b.length - a.length);

  return (value) => {
    if (value === undefined || value === null) return value;
    let text = String(value);

    text = text.replace(MONGO_URI_PATTERN, (found) => {
      const host = extractMongoHost(found);
      return host ? `<mongo-uri host=${host}>` : '<mongo-uri>';
    });

    for (const secret of orderedSecrets) {
      text = text.split(secret).join('<redacted>');
    }

    return text.replace(SECRET_PARAM_PATTERN, '$1=<redacted>');
  };
};

const identity = (value) => value;

const describeCause = (cause, redact) => {
  if (!cause || typeof cause !== 'object') return null;
  const parts = [];
  if (cause.name) parts.push(cause.name);
  if (cause.code !== undefined) parts.push(`code=${cause.code}`);
  if (cause.syscall) parts.push(`syscall=${cause.syscall}`);
  if (cause.hostname) parts.push(`hostname=${cause.hostname}`);
  if (cause.message) parts.push(`message="${redact(cause.message)}"`);
  return parts.length ? parts.join(' ') : null;
};

/**
 * For server-selection errors the driver keeps one error per server it tried
 * (error.reason.servers is a Map<address, ServerDescription>). That inner error
 * is usually the real cause, so surface each of them.
 */
const describeServers = (error, redact) => {
  const servers = error?.reason?.servers;
  if (!servers || typeof servers.forEach !== 'function') return [];

  const lines = [];
  servers.forEach((description, address) => {
    const serverError = description?.error;
    const type = description?.type ? ` type=${description.type}` : '';
    const detail = serverError
      ? `${serverError.name || 'Error'}: ${redact(serverError.message)}`
      : 'no error recorded';
    lines.push(`${address}${type} → ${detail}`);
  });
  return lines;
};

/**
 * Suggests the most likely fix based on the error name, code and message.
 */
export const getDbErrorHint = (error) => {
  if (!error) return null;
  const name = String(error.name || '');
  const code = error.code;
  const causeCode = error.cause?.code;
  const text = [
    error.message,
    error.cause?.message,
    ...describeServers(error, identity),
  ].filter(Boolean).join(' ');

  if (code === 18 || code === 8000 || /bad auth|authentication failed/i.test(text)) {
    return 'Authentication failed: the username/password in MONGODB_URI is wrong, or the user has no access to this database. Special characters in the password must be URL-encoded.';
  }
  if (name === 'MongoParseError' || /invalid (connection string|scheme)|URI .*malformed/i.test(text)) {
    return 'MONGODB_URI is malformed. It must use the "mongodb" or "mongodb+srv" scheme and URL-encode special characters in the password.';
  }
  if (causeCode === 'ENOTFOUND' || /ENOTFOUND|querySrv|ESERVFAIL|EAI_AGAIN/i.test(text)) {
    return 'DNS lookup for the cluster host failed: check the host name in MONGODB_URI and that this machine has internet/DNS access (some networks block SRV lookups).';
  }
  if (causeCode === 'ECONNREFUSED' || /ECONNREFUSED/i.test(text)) {
    return 'Connection refused: no MongoDB server is listening at that host/port. If it is local, make sure mongod is running.';
  }
  if (/whitelist|IP.*access list|not allowed to access/i.test(text)) {
    return "This machine's IP address is not in the MongoDB Atlas Network Access list.";
  }
  if (/buffering timed out/i.test(text)) {
    return 'Mongoose gave up waiting for a connection: the app is not connected to MongoDB (see earlier connection errors).';
  }
  if (/ETIMEDOUT|timed out|Server selection timed out/i.test(text) || /ServerSelection/i.test(name)) {
    return "Could not reach any server in time: usually the Atlas Network Access list does not include this machine's IP, a firewall/VPN blocks port 27017, or the cluster is paused.";
  }
  if (code === 13 || /not authorized/i.test(text)) {
    return 'The database user is connected but lacks permission for this operation; check its roles in Atlas.';
  }
  return null;
};

/**
 * Collects every useful, log-safe field from a database error.
 */
export const describeDbError = (error, redact = createRedactor()) => {
  if (!error) return { message: 'Unknown database error' };

  const details = {
    name: error.name,
    message: redact(error.message),
  };

  if (error.code !== undefined) details.code = error.code;
  if (error.codeName) details.codeName = error.codeName;

  const labels = typeof error.errorLabels === 'object' && error.errorLabels
    ? [...error.errorLabels]
    : (error.errorLabelSet ? [...error.errorLabelSet] : []);
  if (labels.length) details.labels = labels;

  const cause = describeCause(error.cause, redact);
  if (cause) details.cause = cause;

  const servers = describeServers(error, redact);
  if (servers.length) details.servers = servers;

  if (error.reason?.type) details.topology = error.reason.type;

  const hint = getDbErrorHint(error);
  if (hint) details.hint = hint;

  return details;
};

/**
 * Renders describeDbError() output as indented lines for a single log entry.
 */
export const formatDbErrorDetails = (details) => {
  const lines = [];
  if (details.name) lines.push(`  error:    ${details.name}`);
  if (details.message) lines.push(`  message:  ${details.message}`);
  if (details.code !== undefined) {
    lines.push(`  code:     ${details.code}${details.codeName ? ` (${details.codeName})` : ''}`);
  }
  if (details.labels) lines.push(`  labels:   ${details.labels.join(', ')}`);
  if (details.cause) lines.push(`  cause:    ${details.cause}`);
  if (details.topology) lines.push(`  topology: ${details.topology}`);
  if (details.servers) {
    lines.push('  servers:');
    details.servers.forEach((line) => lines.push(`    - ${line}`));
  }
  if (details.hint) lines.push(`  hint:     ${details.hint}`);
  return lines.join('\n');
};

const DB_ERROR_NAME_PATTERN = /^(Mongo|Mongoose)|^(ValidationError|CastError|DocumentNotFoundError|VersionError|ParallelSaveError|StrictModeError|DivergentArrayError|OverwriteModelError|MissingSchemaError)$/;

/**
 * True for errors raised by the MongoDB driver or Mongoose.
 */
export const isDbError = (error) => Boolean(error) && (
  DB_ERROR_NAME_PATTERN.test(String(error.name || ''))
  || /buffering timed out/i.test(String(error.message || ''))
);
