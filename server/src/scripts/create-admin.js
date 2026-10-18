// ============================================================
// VIDYALINK — Production Admin Account Provisioning Script
// ============================================================
// Secure, fail-closed initial administrator bootstrap utility.
//
// Security Constraints:
//   1. PASSWORDS MUST NEVER BE PASSED VIA CLI ARGUMENTS (--password).
//      CLI flags are recorded in shell history (.bash_history) and
//      visible in process monitoring tools (`ps aux`).
//   2. Passwords should be supplied interactively (hidden input)
//      or via the ADMIN_PASSWORD environment variable for automation.
//   3. Existing non-admin accounts WILL NOT be automatically promoted.
//   4. Existing user passwords WILL NEVER be overwritten.
//   5. Already-admin accounts are treated idempotently with zero mutations.
// ============================================================

import readline from 'node:readline';
import { Writable } from 'node:stream';
import mongoose from 'mongoose';
import User from '../models/user.model.js';
import { env } from '../config/env.js';

/**
 * Validate administrator input strictly according to platform security policy.
 */
export const validateAdminInput = ({ email, password, fullName }) => {
  if (!email || typeof email !== 'string') {
    throw new Error('Email is required');
  }
  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new Error('Please provide a valid email address');
  }

  if (!fullName || typeof fullName !== 'string') {
    throw new Error('Full name is required');
  }
  const normalizedName = fullName.trim();
  if (normalizedName.length < 3 || normalizedName.length > 100) {
    throw new Error('Full name must be between 3 and 100 characters');
  }

  if (!password || typeof password !== 'string') {
    throw new Error('Password is required');
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  if (password.length > 128) {
    throw new Error('Password must not exceed 128 characters');
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    throw new Error('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('Password must contain at least one number');
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
    throw new Error('Password must contain at least one special character');
  }

  return {
    email: normalizedEmail,
    fullName: normalizedName,
    password,
  };
};

/**
 * Parse CLI arguments in --key=value format.
 */
export const parseArgs = (argv = process.argv.slice(2)) => {
  const args = {};
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const [key, ...values] = arg.slice(2).split('=');
      args[key] = values.join('=');
    }
  }
  return args;
};

/**
 * Securely prompt for password with hidden terminal echo.
 */
export const promptPassword = (query = 'Enter administrator password: ', input = process.stdin, output = process.stdout) => {
  return new Promise((resolve) => {
    let muted = false;
    const mutableStdout = new Writable({
      write(chunk, encoding, callback) {
        if (!muted) {
          output.write(chunk, encoding);
        }
        callback();
      },
    });

    const rl = readline.createInterface({
      input,
      output: mutableStdout,
      terminal: true,
    });

    output.write(query);
    muted = true;

    rl.question('', (answer) => {
      muted = false;
      output.write('\n');
      rl.close();
      resolve(answer.trim());
    });
  });
};

/**
 * Core admin provisioning business logic.
 * Encapsulated for direct, isolated unit testing without database connectivity.
 */
export const provisionAdmin = async ({
  email,
  password,
  fullName = 'System Administrator',
  mongoUri = env.MONGODB_URI,
  userModel = User,
  dbConnection = mongoose,
  logger = console,
}) => {
  // 1. Pre-connection validation
  if (!mongoUri || typeof mongoUri !== 'string' || mongoUri.trim() === '') {
    throw new Error('Database connection string (MONGODB_URI) is required');
  }

  const validated = validateAdminInput({ email, password, fullName });

  // 2. Connect to database
  logger.info('Connecting to database...');
  await dbConnection.connect(mongoUri);
  logger.info('Connected to database successfully.');

  try {
    // 3. Inspect existing account
    const existingUser = await userModel.findOne({ email: validated.email });

    if (existingUser) {
      if (existingUser.role === 'admin') {
        logger.info(`Administrator account already exists for ${validated.email}. No changes made.`);
        return { action: 'already_exists', email: validated.email };
      }

      // Existing non-admin: Fail-closed. Refuse automatic privilege escalation.
      throw new Error(`Account already exists with email ${validated.email} with non-admin role (${existingUser.role}). Automatic privilege promotion is forbidden.`);
    }

    // 4. Create new admin account
    const newAdmin = new userModel({
      fullName: validated.fullName,
      email: validated.email,
      password: validated.password, // Pre-save hook in user.model.js will securely hash this with bcrypt (12 rounds)
      role: 'admin',
      isEmailVerified: true,
      status: 'active',
    });

    await newAdmin.save();
    logger.info(`Administrator account successfully created for ${validated.email}.`);
    return { action: 'created', email: validated.email };
  } catch (error) {
    if (error.code === 11000 || error.message?.includes('E11000 duplicate key')) {
      throw new Error(`Concurrent registration detected for ${validated.email}. Administrator creation aborted.`);
    }
    throw error;
  } finally {
    try {
      await dbConnection.disconnect();
      logger.info('Database connection closed.');
    } catch {
      // Ignore disconnect errors in teardown
    }
  }
};

/**
 * CLI execution entrypoint.
 */
export const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  // Security Gate: Reject CLI password flags
  if ('password' in args || process.argv.some((arg) => arg.startsWith('--password'))) {
    console.error('\n❌ SECURITY ERROR: Passing passwords via command-line flags (--password) is forbidden.');
    console.error('Command-line arguments are stored in shell history and visible in system process listings.');
    console.error('Please provide the password via the ADMIN_PASSWORD environment variable or enter it at the prompt.\n');
    process.exit(1);
  }

  const email = (args.email || process.env.ADMIN_EMAIL || '').trim();
  const fullName = (args.name || process.env.ADMIN_NAME || 'System Administrator').trim();
  let password = process.env.ADMIN_PASSWORD || '';

  if (!password && process.stdin.isTTY) {
    password = await promptPassword('Enter administrator password: ');
  }

  try {
    await provisionAdmin({ email, password, fullName });
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}\n`);
    process.exit(1);
  }
};

if (process.argv[1]?.endsWith('create-admin.js')) {
  main();
}
