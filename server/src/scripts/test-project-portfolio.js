import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import User from '../models/user.model.js';
import projectService from '../services/project.service.js';
import logger from '../utils/logger.js';

const run = async () => {
  let testUser;
  const testPassword = `Test-${randomUUID()}-Aa1!`;

  try {
    await mongoose.connect(env.database.mongoUri);
    testUser = await User.create({
      fullName: 'Project Portfolio Test Student',
      email: `project_portfolio_${Date.now()}@vidyalink.test`,
      password: testPassword,
      role: 'student',
      status: 'active',
    });

    const created = await projectService.createProject(testUser._id, {
      title: 'Portfolio CRUD Test',
      shortDescription: 'A short description for the project portfolio test.',
      detailedDescription: 'A detailed project description long enough for the project portfolio validation test.',
      category: 'Web Development',
      domain: 'Education Technology',
      technologies: ['React', 'Node.js'],
      githubRepository: 'https://github.com/example/portfolio-test',
      projectStatus: 'Prototype',
      featured: true,
    });

    assert.equal(created.verificationStatus, 'Pending');
    assert.equal(created.featured, true);
    assert.deepEqual(created.technologies, ['React', 'Node.js']);

    const listed = await projectService.getProjects(testUser._id, { filter: 'Featured' });
    assert.equal(listed.length, 1);

    const fetched = await projectService.getProjectById(testUser._id, created._id);
    assert.equal(fetched.title, 'Portfolio CRUD Test');

    const updated = await projectService.updateProject(testUser._id, created._id, {
      title: 'Updated Portfolio CRUD Test',
      projectStatus: 'Completed',
      featured: false,
    });
    assert.equal(updated.title, 'Updated Portfolio CRUD Test');
    assert.equal(updated.projectStatus, 'Completed');

    await projectService.deleteProject(testUser._id, created._id);
    await assert.rejects(
      () => projectService.getProjectById(testUser._id, created._id),
      (error) => error.statusCode === 404
    );

    console.log('Project portfolio CRUD tests passed.');
  } finally {
    if (testUser) await User.deleteOne({ _id: testUser._id });
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  logger.error('Project portfolio CRUD tests failed', error);
  process.exitCode = 1;
});
