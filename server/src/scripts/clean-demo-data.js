import mongoose from 'mongoose';
import { DEFAULT_DB_NAME } from '../config/db.js';
import User from '../models/user.model.js';
import StudentProfile from '../models/studentProfile.model.js';
import Profile from '../models/profile.model.js';
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
  // Synthetic candidates created by seed-rich-demo.js
  'priya.demo@institute.edu',
  'rahul.demo@institute.edu',
  'ananya.demo@institute.edu',
  'karan.demo@institute.edu',
];

const DEMO_PROJECT_TITLES = [
  'Distributed ML Model Serving Pipeline',
  'Autonomous Vision & Edge Telemetry (Demo)',
  'Academic Skill & Evidence Registry',
  'Real-Time Telemetry Event Bus',
];

async function cleanDemoData() {
  console.log(`Connecting to MongoDB (database: ${DEFAULT_DB_NAME})...`);
  await mongoose.connect(env.MONGODB_URI, { dbName: DEFAULT_DB_NAME });

  console.log('Searching for demo accounts and records...');

  const demoUsers = await User.find({ email: { $in: DEMO_EMAILS } });
  const demoUserIds = demoUsers.map((u) => u._id);

  console.log(`Found ${demoUsers.length} demo user accounts to clean.`);

  if (demoUserIds.length > 0) {
    // Clean associated profiles
    const [profRes, legacyProfRes] = await Promise.all([
      Profile.deleteMany({ user: { $in: demoUserIds } }),
      StudentProfile.deleteMany({ user: { $in: demoUserIds } }),
    ]);
    console.log(`Removed ${profRes.deletedCount + legacyProfRes.deletedCount} profiles.`);

    // Clean demo applications
    const appRes = await Application.deleteMany({
      $or: [
        { studentId: { $in: demoUserIds } },
        { student: { $in: demoUserIds } },
        { recruiterId: { $in: demoUserIds } },
      ],
    });
    console.log(`Removed ${appRes.deletedCount} demo applications.`);

    // Clean demo workspaces & milestones
    const demoProjects = await Project.find({
      $or: [
        { userId: { $in: demoUserIds } },
        { title: { $in: DEMO_PROJECT_TITLES } },
      ],
    });
    const demoProjectIds = demoProjects.map((p) => p._id);

    const workspaceFilter = {
      $or: [
        { student: { $in: demoUserIds } },
        { owner: { $in: demoUserIds } },
        { project: { $in: demoProjectIds } },
      ],
    };
    const demoWorkspaceIds = (await Workspace.find(workspaceFilter).select('_id')).map((w) => w._id);

    // Milestones belong to workspaces.
    const msRes = await Milestone.deleteMany({ workspace: { $in: demoWorkspaceIds } });

    const wsRes = await Workspace.deleteMany({ _id: { $in: demoWorkspaceIds } });
    console.log(`Removed ${wsRes.deletedCount} demo workspaces.`);

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
