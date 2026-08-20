import mongoose from 'mongoose';
import User from '../models/user.model.js';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

const DEMO_USERS = [
  {
    fullName: 'Alex Student',
    email: 'student@vidyalink.edu',
    password: env.seed.demoUserPassword,
    role: 'student',
    college: 'MIT University',
    branch: 'Computer Science',
    graduationYear: 2026,
    isEmailVerified: true,
  },
  {
    fullName: 'Dr. Sarah Jenkins',
    email: 'faculty@vidyalink.edu',
    password: env.seed.demoUserPassword,
    role: 'faculty',
    college: 'MIT University',
    branch: 'Computer Science',
    isEmailVerified: true,
  },
  {
    fullName: 'Marcus Vance',
    email: 'recruiter@vidyalink.edu',
    password: env.seed.demoUserPassword,
    role: 'recruiter',
    college: 'Tech Corp',
    isEmailVerified: true,
  },
  {
    fullName: 'Elena Rostova',
    email: 'alumni@vidyalink.edu',
    password: env.seed.demoUserPassword,
    role: 'alumni',
    college: 'MIT University',
    branch: 'Software Engineering',
    graduationYear: 2022,
    isEmailVerified: true,
  },
  {
    fullName: 'System Admin',
    email: 'admin@vidyalink.edu',
    password: env.seed.demoUserPassword,
    role: 'admin',
    isEmailVerified: true,
  },
];

async function seed() {
  try {
    if (!env.seed.demoUserPassword) {
      throw new Error('DEMO_USER_PASSWORD must be configured before running the seed script');
    }

    logger.info('Connecting to MongoDB for seed data');
    await mongoose.connect(env.database.mongoUri);

    logger.info('Seeding demo accounts');

    for (const userData of DEMO_USERS) {
      const existing = await User.findOne({ email: userData.email });
      if (existing) {
        existing.password = userData.password;
        existing.fullName = userData.fullName;
        existing.role = userData.role;
        existing.college = userData.college;
        existing.branch = userData.branch;
        existing.graduationYear = userData.graduationYear;
        existing.isEmailVerified = true;
        await existing.save();
        logger.info('Updated demo account', { email: userData.email });
      } else {
        await User.create(userData);
        logger.info('Created demo account', { email: userData.email });
      }
    }

    logger.success('Seed completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Seed failed', error);
    process.exit(1);
  }
}

seed();
