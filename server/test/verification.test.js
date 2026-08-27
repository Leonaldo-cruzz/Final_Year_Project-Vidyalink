import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'verification-test-access-secret';
process.env.JWT_REFRESH_SECRET = 'verification-test-refresh-secret';
process.env.API_PREFIX = '/api/v1';
process.env.MONGODB_URI = `mongodb://127.0.0.1:27017/vidyalink_verification_test_${process.pid}`;

const [{ default: User }, { default: Project }, { createApp }] = await Promise.all([
  import('../src/models/user.model.js'),
  import('../src/models/project.model.js'),
  import('../src/app.js'),
]);

const app = createApp();
let student;
let faculty;
let recruiter;
let studentToken;
let facultyToken;
let recruiterToken;

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

const createProject = () => Project.create({
  userId: student._id,
  title: `Verification test project ${new mongoose.Types.ObjectId()}`,
  shortDescription: 'A project used by the verification API integration tests.',
  detailedDescription: 'A complete project record that is owned by the test student.',
  category: 'Web Development',
  technologies: ['React', 'Node.js'],
});

const submitProject = async () => {
  const project = await createProject();
  const response = await request(app)
    .post('/api/v1/verification/submit')
    .set(authHeader(studentToken))
    .send({ targetType: 'PROJECT', targetId: String(project._id) });

  expect(response.status).toBe(201);
  return { project, verification: response.body.data };
};

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  [student, faculty, recruiter] = await User.create([
    {
      fullName: 'Verification Student',
      email: 'verification.student@example.com',
      password: 'verification-password',
      role: 'student',
    },
    {
      fullName: 'Verification Faculty',
      email: 'verification.faculty@example.com',
      password: 'verification-password',
      role: 'faculty',
    },
    {
      fullName: 'Verification Recruiter',
      email: 'verification.recruiter@example.com',
      password: 'verification-password',
      role: 'recruiter',
    },
  ]);

  studentToken = student.generateAccessToken();
  facultyToken = faculty.generateAccessToken();
  recruiterToken = recruiter.generateAccessToken();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('verification API', () => {
  it('submits a project for verification', async () => {
    const { verification } = await submitProject();

    expect(verification.targetType).toBe('PROJECT');
    expect(verification.status).toBe('PENDING');
    expect(String(verification.studentId)).toBe(String(student._id));
  });

  it('returns pending verification requests to faculty', async () => {
    const { verification } = await submitProject();

    const response = await request(app)
      .get('/api/v1/verification/pending')
      .set(authHeader(facultyToken));

    expect(response.status).toBe(200);
    const pending = response.body.data.find((record) => String(record._id) === String(verification._id));
    expect(pending?.status).toBe('PENDING');
  });

  it('approves a pending verification', async () => {
    const { verification } = await submitProject();

    const response = await request(app)
      .patch(`/api/v1/verification/${verification._id}/approve`)
      .set(authHeader(facultyToken))
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('VERIFIED');
    expect(response.body.data.verifiedAt).toBeTruthy();
  });

  it('rejects a pending verification with remarks', async () => {
    const { verification } = await submitProject();

    const response = await request(app)
      .patch(`/api/v1/verification/${verification._id}/reject`)
      .set(authHeader(facultyToken))
      .send({ remarks: 'Please provide a working deployment link.' });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('REJECTED');
    expect(response.body.data.remarks).toBe('Please provide a working deployment link.');
  });

  it('requests changes on a pending verification with remarks', async () => {
    const { verification } = await submitProject();

    const response = await request(app)
      .patch(`/api/v1/verification/${verification._id}/request-changes`)
      .set(authHeader(facultyToken))
      .send({ remarks: 'Add evidence for the listed technologies.' });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('CHANGES_REQUESTED');
    expect(response.body.data.remarks).toBe('Add evidence for the listed technologies.');
  });

  it('rejects unauthorized roles from the faculty queue', async () => {
    const response = await request(app)
      .get('/api/v1/verification/pending')
      .set(authHeader(recruiterToken));

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/Access denied/i);
  });
});
