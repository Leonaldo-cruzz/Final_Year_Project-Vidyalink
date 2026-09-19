import mongoose from 'mongoose';
import User from '../models/user.model.js';
import StudentProfile from '../models/studentProfile.model.js';
import Project from '../models/project.model.js';
import Workspace from '../models/workspace.model.js';
import Milestone from '../models/milestone.model.js';
import Portfolio from '../models/portfolio.model.js';
import Application from '../models/application.model.js';
import { env } from '../config/env.js';

const DEMO_EMAILS = [
  'student@vidyalink.edu',
  'faculty@vidyalink.edu',
  'recruiter@vidyalink.edu',
  'alumni@vidyalink.edu',
  'admin@vidyalink.edu',
  'priya.demo@institute.edu',
  'rahul.demo@tech.edu',
  'ananya.demo@metro.edu',
];

const DEMO_PROJECT_TITLES = [
  'Distributed ML Model Serving Pipeline',
  'Autonomous Vision & Edge Telemetry (Demo)',
  'Academic Skill & Evidence Registry',
  'Real-Time Telemetry Event Bus',
];

async function cleanDemoData() {
  console.log('Connecting to MongoDB at:', env.MONGO_URI);
  await mongoose.connect(env.MONGO_URI);

  console.log('Searching for demo accounts and records...');

  const demoUsers = await User.find({ email: { $in: DEMO_EMAILS } });
  const demoUserIds = demoUsers.map((u) => u._id);

  console.log(`Found ${demoUsers.length} demo user accounts to clean.`);

  if (demoUserIds.length > 0) {
    // Clean associated profiles
    const profRes = await StudentProfile.deleteMany({ user: { $in: demoUserIds } });
    console.log(`Removed ${profRes.deletedCount} student profiles.`);

    // Clean demo applications
    const appRes = await Application.deleteMany({
      $or: [
        { student: { $in: demoUserIds } },
        { recruiter: { $in: demoUserIds } },
      ],
    });
    console.log(`Removed ${appRes.deletedCount} demo applications.`);

    // Clean demo workspaces & milestones
    const demoProjects = await Project.find({
      $or: [
        { owner: { $in: demoUserIds } },
        { title: { $in: DEMO_PROJECT_TITLES } },
      ],
    });
    const demoProjectIds = demoProjects.map((p) => p._id);

    const wsRes = await Workspace.deleteMany({
      $or: [
        { student: { $in: demoUserIds } },
        { project: { $in: demoProjectIds } },
      ],
    });
    console.log(`Removed ${wsRes.deletedCount} demo workspaces.`);

    const msRes = await Milestone.deleteMany({
      $or: [
        { student: { $in: demoUserIds } },
        { project: { $in: demoProjectIds } },
      ],
    });
    console.log(`Removed ${msRes.deletedCount} demo milestones.`);

    const pfRes = await Portfolio.deleteMany({
      $or: [
        { student: { $in: demoUserIds } },
        { verifiedBy: { $in: demoUserIds } },
      ],
    });
    console.log(`Removed ${pfRes.deletedCount} demo portfolios.`);

    // Delete projects
    const projRes = await Project.deleteMany({ _id: { $in: demoProjectIds } });
    console.log(`Removed ${projRes.deletedCount} demo projects.`);

    // Delete demo users
    const userRes = await User.deleteMany({ _id: { $in: demoUserIds } });
    console.log(`Removed ${userRes.deletedCount} demo user accounts.`);
  }

  console.log('✅ Demo data cleanup complete! Real user records preserved.');
  await mongoose.disconnect();
}

if (process.argv[1]?.endsWith('clean-demo-data.js')) {
  cleanDemoData().catch((err) => {
    console.error('Error during cleanup:', err);
    process.exit(1);
  });
}

export default cleanDemoData;
