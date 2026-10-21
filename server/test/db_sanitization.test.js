import test from 'node:test';
import assert from 'node:assert/strict';
import {
  connectDB,
  SANITIZED_DB_ERROR_MESSAGE,
  DEFAULT_DB_NAME,
  extractSafeErrorMetadata,
} from '../src/config/db.js';
import {
  sanitizeStartupErrorMessage,
  handleStartupError,
} from '../src/index.js';

const FAKE_USER = 'clusterAdminUser';
const FAKE_PASS = 'P@ssw0rd!SuperSecret#99';
const FAKE_URI = `mongodb+srv://${FAKE_USER}:${FAKE_PASS}@cluster0.abcde.mongodb.net/vidyalink_prod?retryWrites=true&w=majority`;

test('TC-DB-SEC-1: extractSafeErrorMetadata extracts allowlisted metadata and rejects secrets', () => {
  // Safe cases
  assert.equal(
    extractSafeErrorMetadata({ name: 'MongoParseError', code: 123 }),
    'name: MongoParseError, code: 123'
  );
  assert.equal(
    extractSafeErrorMetadata({ name: 'MongoServerSelectionError' }),
    'name: MongoServerSelectionError'
  );
  assert.equal(
    extractSafeErrorMetadata({ code: 18 }),
    'code: 18'
  );

  // Unsafe / invalid cases must NOT be included
  assert.equal(
    extractSafeErrorMetadata({ name: `Invalid ${FAKE_USER}`, code: 'NaN' }),
    null
  );
  assert.equal(
    extractSafeErrorMetadata({ message: `Secret ${FAKE_PASS}` }),
    null
  );
  assert.equal(extractSafeErrorMetadata(null), null);
  assert.equal(extractSafeErrorMetadata(undefined), null);
});

test('TC-DB-SEC-2: connectDB sanitizes connection errors with fake credentials in error.message', async () => {
  const errorLogs = [];
  const mockLogger = {
    log: () => {},
    warn: () => {},
    error: (msg) => errorLogs.push(msg),
  };

  const rawDriverError = new Error(`Invalid connection string: ${FAKE_URI}`);
  rawDriverError.name = 'MongoParseError';

  const mockClient = {
    connect: async () => {
      throw rawDriverError;
    },
    connection: {
      once: () => {},
    },
  };

  await assert.rejects(
    async () => {
      await connectDB(FAKE_URI, mockClient, mockLogger);
    },
    (err) => {
      // 1. Thrown message must be the sanitized stable message
      assert.equal(err.message, SANITIZED_DB_ERROR_MESSAGE);

      // 2. Thrown message must NEVER contain fake credentials or URI
      assert.equal(err.message.includes(FAKE_USER), false, 'Thrown error must not contain username');
      assert.equal(err.message.includes(FAKE_PASS), false, 'Thrown error must not contain password');
      assert.equal(err.message.includes(FAKE_URI), false, 'Thrown error must not contain URI');
      assert.equal(err.message.includes('mongodb+srv://'), false, 'Thrown error must not contain connection scheme');

      // 3. Allowlisted safe properties are preserved
      assert.equal(err.name, 'MongoParseError');
      return true;
    }
  );

  // 4. Verify captured logger output
  assert.equal(errorLogs.length, 1);
  const loggedError = errorLogs[0];

  assert.equal(loggedError.includes(FAKE_USER), false, 'Logs must not contain username');
  assert.equal(loggedError.includes(FAKE_PASS), false, 'Logs must not contain password');
  assert.equal(loggedError.includes(FAKE_URI), false, 'Logs must not contain URI');
  assert.equal(loggedError.includes('mongodb+srv://'), false, 'Logs must not contain connection scheme');
  assert.ok(loggedError.includes(SANITIZED_DB_ERROR_MESSAGE), 'Logs must include sanitized message');
  assert.ok(loggedError.includes('name: MongoParseError'), 'Logs should include safe metadata');
});

test('TC-DB-SEC-3: connectDB preserves numeric error code safely without leaking credentials', async () => {
  const errorLogs = [];
  const mockLogger = {
    log: () => {},
    warn: () => {},
    error: (msg) => errorLogs.push(msg),
  };

  const authError = new Error(`bad auth: Authentication failed for user ${FAKE_USER} with password ${FAKE_PASS}`);
  authError.name = 'MongoServerError';
  authError.code = 18; // Standard MongoDB code for auth failure

  const mockClient = {
    connect: async () => {
      throw authError;
    },
    connection: {
      once: () => {},
    },
  };

  await assert.rejects(
    async () => {
      await connectDB(FAKE_URI, mockClient, mockLogger);
    },
    (err) => {
      assert.equal(err.message, SANITIZED_DB_ERROR_MESSAGE);
      assert.equal(err.message.includes(FAKE_USER), false);
      assert.equal(err.message.includes(FAKE_PASS), false);
      assert.equal(err.name, 'MongoServerError');
      assert.equal(err.code, 18);
      return true;
    }
  );

  assert.equal(errorLogs.length, 1);
  const loggedError = errorLogs[0];
  assert.equal(loggedError.includes(FAKE_USER), false);
  assert.equal(loggedError.includes(FAKE_PASS), false);
  assert.ok(loggedError.includes('name: MongoServerError, code: 18'));
});

test('TC-DB-SEC-4: Runtime error handler sanitizes runtime database errors', async () => {
  const errorLogs = [];
  const mockLogger = {
    log: () => {},
    warn: () => {},
    error: (msg) => errorLogs.push(msg),
  };

  let runtimeErrorHandler = null;
  const mockClient = {
    connect: async () => ({ connection: { host: 'cluster0.mongodb.net' } }),
    connection: {
      once: (event, handler) => {
        if (event === 'error') runtimeErrorHandler = handler;
      },
    },
  };

  await connectDB(FAKE_URI, mockClient, mockLogger);
  assert.ok(typeof runtimeErrorHandler === 'function', 'Runtime error listener must be registered');

  // Trigger runtime error with simulated secret
  const runtimeError = new Error(`connection to ${FAKE_URI} failed: auth ${FAKE_PASS}`);
  runtimeError.name = 'MongoNetworkError';
  runtimeErrorHandler(runtimeError);

  assert.equal(errorLogs.length, 1);
  const loggedError = errorLogs[0];
  assert.equal(loggedError.includes(FAKE_USER), false);
  assert.equal(loggedError.includes(FAKE_PASS), false);
  assert.equal(loggedError.includes(FAKE_URI), false);
  assert.ok(loggedError.includes('name: MongoNetworkError'));
});

test('TC-DB-SEC-5: sanitizeStartupErrorMessage and handleStartupError redact credentials', () => {
  const errorLogs = [];
  const mockLogger = {
    error: (...args) => errorLogs.push(args.join(' ')),
  };

  // 1. Sanitized error from connectDB passes through cleanly
  const dbError = new Error(SANITIZED_DB_ERROR_MESSAGE);
  handleStartupError(dbError, mockLogger);
  assert.ok(errorLogs[0].includes(SANITIZED_DB_ERROR_MESSAGE));
  assert.equal(errorLogs[0].includes('password'), false);

  // 2. Unhandled raw error with URI and credentials gets redacted
  const rawLeakError = new Error(`Failed to initialize: connection ${FAKE_URI} failed password=${FAKE_PASS}`);
  handleStartupError(rawLeakError, mockLogger);

  const secondLog = errorLogs[1];
  assert.equal(secondLog.includes(FAKE_USER), false, 'Startup logger must redact username');
  assert.equal(secondLog.includes(FAKE_PASS), false, 'Startup logger must redact password');
  assert.ok(secondLog.includes('mongodb+srv://<redacted>'));
  assert.ok(secondLog.includes('password=<redacted>'));
});

test('TC-DB-SEC-6: Successful connection resolves normally and logs host and dbName without credentials', async () => {
  const infoLogs = [];
  const mockLogger = {
    log: (msg) => infoLogs.push(msg),
    warn: () => {},
    error: () => {},
  };

  let capturedUri = null;
  let capturedOptions = null;

  const mockClient = {
    connect: async (uri, options) => {
      capturedUri = uri;
      capturedOptions = options;
      return { connection: { host: 'vidyalink-atlas.mongodb.net', name: 'vidyalink' } };
    },
    connection: {
      once: () => {},
    },
  };

  await connectDB(FAKE_URI, mockClient, mockLogger);
  assert.equal(infoLogs.length, 1);
  assert.equal(infoLogs[0], 'MongoDB connected: vidyalink-atlas.mongodb.net (db: vidyalink)');
  assert.equal(infoLogs[0].includes(FAKE_USER), false);
  assert.equal(infoLogs[0].includes(FAKE_PASS), false);
  assert.equal(capturedUri, FAKE_URI);
  assert.deepEqual(capturedOptions, { dbName: 'vidyalink' });
});

test('TC-DB-SEC-7: connectDB enforces dbName: vidyalink regardless of URI database path or caller options', async () => {
  const infoLogs = [];
  const mockLogger = {
    log: (msg) => infoLogs.push(msg),
    warn: () => {},
    error: () => {},
  };

  let capturedOptions = null;
  const mockClient = {
    connect: async (_uri, options) => {
      capturedOptions = options;
      return { connection: { host: 'vidyalink-atlas.mongodb.net', name: options.dbName } };
    },
    connection: { once: () => {} },
  };

  assert.equal(DEFAULT_DB_NAME, 'vidyalink');

  // 1. URI with NO database path (which causes Mongo driver to default to 'test')
  const URI_WITHOUT_DB = `mongodb+srv://${FAKE_USER}:${FAKE_PASS}@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`;
  await connectDB(URI_WITHOUT_DB, mockClient, mockLogger);
  assert.equal(capturedOptions.dbName, 'vidyalink', 'Must explicitly enforce dbName vidyalink');
  assert.notEqual(capturedOptions.dbName, 'test', 'Must never allow silent fallback to test database');

  // 2. Caller attempting to override dbName with 'test' must be overridden by DEFAULT_DB_NAME
  await connectDB(URI_WITHOUT_DB, mockClient, mockLogger, { dbName: 'test' });
  assert.equal(capturedOptions.dbName, 'vidyalink', 'Must override any attempt to connect to test database');

  // 3. Verify logs confirm (db: vidyalink) and no credentials
  assert.ok(infoLogs.every((log) => log.includes('(db: vidyalink)')));
  assert.ok(infoLogs.every((log) => !log.includes(FAKE_USER) && !log.includes(FAKE_PASS)));
});
