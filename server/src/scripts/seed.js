import mongoose from 'mongoose';
import User from '../models/user.model.js';
import { env } from '../config/env.js';

const DEMO_USERS = [
  {
    fullName: 'Alex Student',
    email: 'student@vidyalink.edu',
    password: 'Password123!',
    role: 'student',
    college: 'MIT University',
    branch: 'Computer Science',
    graduationYear: 2026,
    isEmailVerified: true,
  },
  {
    fullName: 'Dr. Sarah Jenkins',
    email: 'faculty@vidyalink.edu',
    password: 'Password123!',
    role: 'faculty',
    college: 'MIT University',
    branch: 'Computer Science',
    isEmailVerified: true,
  },
  {
    fullName: 'Marcus Vance',
    email: 'recruiter@vidyalink.edu',
    password: 'Password123!',
    role: 'recruiter',
    college: 'Tech Corp',
    isEmailVerified: true,
  },
  {
    fullName: 'Elena Rostova',
    email: 'alumni@vidyalink.edu',
    password: 'Password123!',
    role: 'alumni',
    college: 'MIT University',
    branch: 'Software Engineering',
    graduationYear: 2022,
    isEmailVerified: true,
  },
  {
    fullName: 'System Admin',
    email: 'admin@vidyalink.edu',
    password: 'Password123!',
    role: 'admin',
    isEmailVerified: true,
  },
];

async function seed() {
  try {
    const mongoUri = env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vidyalink';
    console.log(`Connecting to MongoDB at ${mongoUri}...`);
    await mongoose.connect(mongoUri);

    console.log('Seeding demo accounts...');

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
        console.log(`Updated demo account: ${userData.email}`);
      } else {
        await User.create(userData);
        console.log(`Created demo account: ${userData.email}`);
      }
    }

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
