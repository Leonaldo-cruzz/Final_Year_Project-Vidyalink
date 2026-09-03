import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import test, { after, afterEach, before, beforeEach } from 'node:test';

const PASSWORD = 'Integration123!';
const TEST_TIMEOUT_MS = 15_000;
const testFiles = new Set();

let setupError = null;
let mongoProcess = null;
let mongoDataDirectory = null;
let mongoose = null;
let appServer = null;
let baseUrl = null;
let models = null;
let uploadDirectories = null;

const getFreePort = async () => {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return port;
};

const canRunCommand = (command) => {
  const result = spawnSync(command, ['--version'], {
    stdio: 'ignore',
    windowsHide: true,
  });
  return result.status === 0;
};

const findMongodBinary = async () => {
  const candidates = [process.env.MONGOD_BINARY?.trim(), 'mongod'].filter(Boolean);

  if (process.platform === 'win32') {
    const mongoServerDirectory = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'MongoDB', 'Server');
    try {
      const versions = await fs.readdir(mongoServerDirectory, { withFileTypes: true });
      versions
        .filter((entry) => entry.isDirectory())
        .sort((first, second) => second.name.localeCompare(first.name, undefined, { numeric: true }))
        .forEach((entry) => candidates.push(
          path.join(mongoServerDirectory, entry.name, 'bin', 'mongod.exe')
        ));
    } catch {
      // The explicit test URI may still be usable when local discovery fails.
    }
  }

  return candidates.find(canRunCommand);
};

const waitForMongoPort = (port, child) => new Promise((resolve, reject) => {
  let attempts = 0;

  const check = () => {
    if (child.exitCode !== null) {
      reject(new Error(`mongod exited before becoming ready (code ${child.exitCode})`));
      return;
    }

    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => {
      socket.destroy();
      resolve();
    });
    socket.once('error', () => {
      socket.destroy();
      attempts += 1;
      if (attempts >= 150) {
        reject(new Error('Timed out waiting for the isolated MongoDB test server'));
        return;
      }
      globalThis.setTimeout(check, 100);
    });
  };

  check();
});

const startIsolatedMongo = async () => {
  const configuredTestUri = process.env.MONGODB_URI_TEST?.trim();
  if (configuredTestUri) {
    return configuredTestUri;
  }

  const mongodBinary = await findMongodBinary();
  if (!mongodBinary) {
    throw new Error('No MONGODB_URI_TEST or local mongod executable is available');
  }

  mongoDataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'vidyalink-integration-'));
  const port = await getFreePort();
  const logPath = path.join(mongoDataDirectory, 'mongod.log');
  mongoProcess = spawn(mongodBinary, [
    '--dbpath', mongoDataDirectory,
    '--port', String(port),
    '--bind_ip', '127.0.0.1',
    '--logpath', logPath,
    '--quiet',
  ], {
    stdio: 'ignore',
    windowsHide: true,
  });

  await waitForMongoPort(port, mongoProcess);
  return `mongodb://127.0.0.1:${port}/vidyalink_integration_${randomUUID().replaceAll('-', '')}`;
};

const importApplication = async (mongoUri) => {
  // env.js deliberately reads this before the application is imported. The
  // test suite never falls back to the developer's configured application DB.
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = mongoUri;
  process.env.RATE_LIMIT_MAX_REQUESTS = '1000';

  const [mongooseModule, appModule, userModule, profileModule, projectModule,
    certificateModule, resumeModule, applicationModule, workspaceModule,
    milestoneModule, engagementModule, portfolioModule, deliverableModule,
    githubAccountModule, resumeUploadModule, certificateUploadModule] = await Promise.all([
    import('mongoose'),
    import('../app.js'),
    import('../models/user.model.js'),
    import('../models/profile.model.js'),
    import('../models/project.model.js'),
    import('../models/certificate.model.js'),
    import('../models/resume.model.js'),
    import('../models/application.model.js'),
    import('../models/workspace.model.js'),
    import('../models/milestone.model.js'),
    import('../models/projectEngagement.model.js'),
    import('../models/portfolio.model.js'),
    import('../models/deliverable.model.js'),
    import('../models/githubAccount.model.js'),
    import('../middleware/resumeUpload.middleware.js'),
    import('../middleware/certificateUpload.middleware.js'),
  ]);

  mongoose = mongooseModule.default;
  models = {
    User: userModule.default,
    Profile: profileModule.default,
    Project: projectModule.default,
    Certificate: certificateModule.default,
    Resume: resumeModule.default,
    Application: applicationModule.default,
    Workspace: workspaceModule.default,
    Milestone: milestoneModule.default,
    ProjectEngagement: engagementModule.default,
    Portfolio: portfolioModule.default,
    Deliverable: deliverableModule.default,
    GithubAccount: githubAccountModule.default,
  };
  uploadDirectories = {
    resume: resumeUploadModule.RESUME_DIRECTORY,
    certificate: certificateUploadModule.CERTIFICATE_DIRECTORY,
  };

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: TEST_TIMEOUT_MS });
  await mongoose.connection.dropDatabase();

  const app = appModule.createApp();
  appServer = await new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${appServer.address().port}/api/v1`;
};

const cleanupTestFiles = async () => {
  await Promise.all([...testFiles].map(async (filePath) => {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }));
  testFiles.clear();
};

const clearDatabase = async () => {
  if (!models) return;
  await Promise.all(Object.values(models).map((model) => model.deleteMany({})));
};

const request = async (endpoint, options = {}) => {
  const headers = { ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}) };
  const init = { method: options.method || 'GET', headers };

  if (options.body instanceof globalThis.FormData) {
    init.body = options.body;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(options.body);
  }

  const response = await globalThis.fetch(`${baseUrl}${endpoint}`, init);
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return { response, status: response.status, data };
};

const assertStatus = (result, expectedStatus) => {
  assert.equal(
    result.status,
    expectedStatus,
    `Expected HTTP ${expectedStatus}, got ${result.status}: ${JSON.stringify(result.data)}`
  );
  assert.equal(result.data?.success, expectedStatus < 400);
};

const credentialsFor = (role, label = role) => ({
  fullName: `Integration ${label}`,
  email: `integration-${role}-${randomUUID()}@example.test`,
  password: PASSWORD,
  role,
});

const registerUser = async (role = 'student', label = role) => {
  const credentials = credentialsFor(role, label);
  const result = await request('/auth/register', { method: 'POST', body: credentials });
  assertStatus(result, 201);
  return { credentials, result, user: result.data.data.user };
};

const loginUser = async (credentials) => {
  const result = await request('/auth/login', { method: 'POST', body: {
    email: credentials.email,
    password: credentials.password,
  } });
  assertStatus(result, 200);
  return { result, token: result.data.data.accessToken, user: result.data.data.user };
};

const registerAndLogin = async (role = 'student', label = role) => {
  const registration = await registerUser(role, label);
  const login = await loginUser(registration.credentials);
  return { ...registration, ...login };
};

const makeCertificateForm = (title = 'Integration Certificate', credentialUrl = 'https://example.test/credentials/integration') => {
  const form = new globalThis.FormData();
  form.append('title', title);
  form.append('issuer', 'VidyaLink Test Academy');
  form.append('category', 'Course');
  form.append('issueDate', '2026-01-15');
  form.append('credentialId', `CRED-${randomUUID()}`);
  form.append('credentialUrl', credentialUrl);
  form.append('skills', 'Node.js, MongoDB, Integration Testing');
  form.append(
    'certificateFile',
    new globalThis.Blob(['%PDF-1.4\nIntegration certificate\n%%EOF'], { type: 'application/pdf' }),
    'integration-certificate.pdf'
  );
  return form;
};

const makeResumeForm = (fileName = 'integration-resume.pdf') => {
  const form = new globalThis.FormData();
  form.append(
    'resume',
    new globalThis.Blob(['%PDF-1.4\nIntegration resume\n%%EOF'], { type: 'application/pdf' }),
    fileName
  );
  return form;
};

const rememberUploadedFile = (fileName, directory) => {
  if (fileName) testFiles.add(path.join(directory, fileName));
};

const integrationTest = (name, handler) => test(name, { concurrency: 1, skip: setupError?.message }, handler);

try {
  const mongoUri = await startIsolatedMongo();
  await importApplication(mongoUri);
} catch (error) {
  setupError = error;
}

before(async () => {
  if (setupError) return;
  await clearDatabase();
});

beforeEach(async () => {
  if (setupError) return;
  await clearDatabase();
  await cleanupTestFiles();
});

afterEach(async () => {
  if (setupError) return;
  await clearDatabase();
  await cleanupTestFiles();
});

after(async () => {
  if (appServer) {
    await new Promise((resolve) => appServer.close(resolve));
  }
  if (mongoose) await mongoose.disconnect();
  if (mongoProcess && mongoProcess.exitCode === null) {
    mongoProcess.kill();
    await new Promise((resolve) => {
      const timeout = globalThis.setTimeout(resolve, 5_000);
      mongoProcess.once('exit', () => {
        globalThis.clearTimeout(timeout);
        resolve();
      });
    });
  }
  if (mongoDataDirectory) await fs.rm(mongoDataDirectory, { recursive: true, force: true });
});

integrationTest('authentication registers a valid student without exposing secrets', async () => {
  const registration = await registerUser('student', 'Valid Registration');
  const returnedUser = registration.user;

  assert.equal(returnedUser.email, registration.credentials.email);
  assert.equal(returnedUser.role, 'student');
  assert.equal(Object.hasOwn(returnedUser, 'password'), false);
  assert.equal(Object.hasOwn(returnedUser, 'refreshToken'), false);
  assert.ok(returnedUser._id);
});

integrationTest('authentication rejects invalid registration input', async () => {
  const result = await request('/auth/register', {
    method: 'POST',
    body: {
      fullName: 'No',
      email: 'not-an-email',
      password: 'weak',
      role: 'admin',
    },
  });

  assertStatus(result, 400);
  assert.ok(Array.isArray(result.data.errors));
  assert.equal(await models.User.countDocuments(), 0);
});

integrationTest('authentication logs in valid credentials and exposes only the access token', async () => {
  const registration = await registerUser();
  const login = await loginUser(registration.credentials);
  const payload = login.result.data.data;

  assert.ok(payload.accessToken);
  assert.equal(Object.hasOwn(payload, 'refreshToken'), false);
  assert.equal(payload.user._id, registration.user._id);
  assert.match(login.result.response.headers.get('set-cookie'), /refreshToken=.*HttpOnly/i);

  const me = await request('/auth/me', { token: login.token });
  assertStatus(me, 200);
  assert.equal(me.data.data.user._id, registration.user._id);
});

integrationTest('authentication rejects invalid login credentials', async () => {
  const registration = await registerUser();
  const result = await request('/auth/login', {
    method: 'POST',
    body: { email: registration.credentials.email, password: 'Wrong123!' },
  });

  assertStatus(result, 401);
  assert.equal(result.data.message, 'Invalid email or password');
});

integrationTest('protected endpoints require a bearer token', async () => {
  const result = await request('/auth/me');
  assertStatus(result, 401);
  assert.match(result.data.message, /token|authentication/i);
});

integrationTest('protected endpoints reject an authenticated user with the wrong role', async () => {
  const faculty = await registerAndLogin('faculty');
  const result = await request('/projects', { token: faculty.token });

  assertStatus(result, 403);
  assert.match(result.data.message, /required role|access denied/i);
});

integrationTest('student portfolio APIs create and isolate profile, project, and certificate records', async () => {
  const student = await registerAndLogin('student', 'Portfolio Owner');
  const otherStudent = await registerAndLogin('student', 'Other Owner');
  const profileBody = {
    fullName: student.user.fullName,
    college: 'VidyaLink University',
    branch: 'Computer Science',
    graduationYear: 2026,
    headline: 'Integration Engineer',
    skills: ['Node.js', 'MongoDB'],
  };

  const profile = await request('/profile', {
    method: 'POST', token: student.token, body: profileBody,
  });
  assertStatus(profile, 201);
  assert.equal(profile.data.data.profile.user._id, student.user._id);

  const updatedProfile = await request('/profile', {
    method: 'PATCH', token: student.token, body: { headline: 'Verified Integration Engineer' },
  });
  assertStatus(updatedProfile, 200);
  assert.equal(updatedProfile.data.data.profile.headline, 'Verified Integration Engineer');

  const project = await request('/projects', {
    method: 'POST',
    token: student.token,
    body: {
      title: 'Integration Portfolio API',
      shortDescription: 'A real integration workflow for student portfolios.',
      detailedDescription: 'This project exercises profile, project, certificate, and authorization behavior.',
      category: 'Web Development',
      technologies: ['Node.js', 'MongoDB'],
    },
  });
  assertStatus(project, 201);
  assert.equal(project.data.data.userId, student.user._id);

  const updatedProject = await request(`/projects/${project.data.data._id}`, {
    method: 'PUT', token: student.token, body: { title: 'Updated Integration Portfolio API' },
  });
  assertStatus(updatedProject, 200);
  assert.equal(updatedProject.data.data.title, 'Updated Integration Portfolio API');

  const certificate = await request('/certificates', {
    method: 'POST', token: student.token, body: makeCertificateForm(),
  });
  assertStatus(certificate, 201);
  assert.equal(certificate.data.data.userId, student.user._id);
  assert.equal(certificate.data.data.verificationStatus, 'Pending');
  rememberUploadedFile(certificate.data.data.certificateFile.storedFileName, uploadDirectories.certificate);

  const certificateFilesBeforeInvalidRequest = await fs.readdir(uploadDirectories.certificate);
  const invalidCertificate = await request('/certificates', {
    method: 'POST',
    token: student.token,
    body: makeCertificateForm('Invalid Certificate', 'javascript:alert(1)'),
  });
  assertStatus(invalidCertificate, 400);
  const certificateFilesAfterInvalidRequest = await fs.readdir(uploadDirectories.certificate);
  assert.deepEqual(certificateFilesAfterInvalidRequest.sort(), certificateFilesBeforeInvalidRequest.sort());
  assert.equal(await models.Certificate.countDocuments({ userId: student.user._id }), 1);

  const updatedCertificate = await request(`/certificates/${certificate.data.data._id}`, {
    method: 'PUT', token: student.token, body: { title: 'Updated Integration Certificate' },
  });
  assertStatus(updatedCertificate, 200);
  assert.equal(updatedCertificate.data.data.title, 'Updated Integration Certificate');
  assert.equal(updatedCertificate.data.data.verificationStatus, 'Pending');

  const certificates = await request('/certificates', { token: student.token });
  assertStatus(certificates, 200);
  assert.equal(certificates.data.data.length, 1);
  assert.equal(certificates.data.data[0].userId, student.user._id);

  const otherProjectRead = await request(`/projects/${project.data.data._id}`, { token: otherStudent.token });
  assertStatus(otherProjectRead, 404);
  const otherProjectUpdate = await request(`/projects/${project.data.data._id}`, {
    method: 'PUT', token: otherStudent.token, body: { title: 'Unauthorized update' },
  });
  assertStatus(otherProjectUpdate, 404);
  const otherCertificateRead = await request(`/certificates/${certificate.data.data._id}`, {
    token: otherStudent.token,
  });
  assertStatus(otherCertificateRead, 404);
  const otherCertificateUpdate = await request(`/certificates/${certificate.data.data._id}`, {
    method: 'PUT', token: otherStudent.token, body: { title: 'Unauthorized certificate update' },
  });
  assertStatus(otherCertificateUpdate, 404);
});

integrationTest('student resume upload, replacement, retrieval, and validation use the authenticated owner', async () => {
  const student = await registerAndLogin();
  const otherStudent = await registerAndLogin('student', 'Resume Other Owner');

  const emptyResume = await request('/resume', { token: student.token });
  assertStatus(emptyResume, 200);
  assert.equal(emptyResume.data.data, null);

  const uploaded = await request('/resume', {
    method: 'POST', token: student.token, body: makeResumeForm(),
  });
  assertStatus(uploaded, 201);
  assert.equal(uploaded.data.data.userId, student.user._id);
  assert.equal(uploaded.data.data.mimeType, 'application/pdf');
  const oldFileName = uploaded.data.data.storedFileName;
  rememberUploadedFile(oldFileName, uploadDirectories.resume);

  const replaced = await request('/resume', {
    method: 'PUT', token: student.token, body: makeResumeForm('replacement-resume.pdf'),
  });
  assertStatus(replaced, 200);
  assert.equal(replaced.data.data.userId, student.user._id);
  assert.equal(replaced.data.data.originalFileName, 'replacement-resume.pdf');
  assert.notEqual(replaced.data.data.storedFileName, oldFileName);
  rememberUploadedFile(replaced.data.data.storedFileName, uploadDirectories.resume);

  const retrieved = await request('/resume', { token: student.token });
  assertStatus(retrieved, 200);
  assert.equal(retrieved.data.data._id, replaced.data.data._id);
  assert.equal(retrieved.data.data.userId, student.user._id);

  const otherResume = await request('/resume', { token: otherStudent.token });
  assertStatus(otherResume, 200);
  assert.equal(otherResume.data.data, null);

  const invalidUpload = await request('/resume', {
    method: 'POST',
    token: student.token,
    body: (() => {
      const form = new globalThis.FormData();
      form.append('resume', new globalThis.Blob(['not a PDF'], { type: 'text/plain' }), 'not-a-resume.txt');
      return form;
    })(),
  });
  assertStatus(invalidUpload, 400);
  assert.equal(await models.Resume.countDocuments({ userId: student.user._id }), 1);
});

integrationTest('verified portfolio is generated by the implemented workspace milestone path and is publicly verifiable', async () => {
  const student = await registerAndLogin('student', 'Verified Portfolio Student');
  const recruiter = await registerAndLogin('recruiter', 'Workspace Owner');

  const projectResponse = await request('/projects', {
    method: 'POST',
    token: student.token,
    body: {
      title: 'Verified Workspace Project',
      shortDescription: 'A project used by the verified portfolio integration test.',
      detailedDescription: 'The workspace milestone path creates a cryptographically verifiable portfolio record.',
      category: 'Web Development',
      technologies: ['Node.js', 'MongoDB'],
    },
  });
  assertStatus(projectResponse, 201);

  const applicationResponse = await request('/applications', {
    method: 'POST',
    token: student.token,
    body: {
      projectId: projectResponse.data.data._id,
      projectOpportunityId: projectResponse.data.data._id,
      coverLetter: 'I can deliver this integration project with care and clear documentation.',
      skills: ['Node.js', 'MongoDB'],
    },
  });
  assertStatus(applicationResponse, 201);

  // There is no mounted workspace-creation endpoint. Seed the persisted
  // legacy workspace record, then exercise milestone and portfolio routes.
  const workspace = await models.Workspace.create({
    project: projectResponse.data.data._id,
    student: student.user._id,
    owner: recruiter.user._id,
    application: applicationResponse.data.data._id,
  });

  const milestoneResponse = await request('/milestones', {
    method: 'POST',
    token: recruiter.token,
    body: {
      workspaceId: workspace._id.toString(),
      title: 'Complete integration verification',
      description: 'Finish the persisted API integration verification milestone.',
      dueDate: '2026-12-31',
    },
  });
  assertStatus(milestoneResponse, 201);

  const submitted = await request(`/milestones/${milestoneResponse.data.data._id}/submit`, {
    method: 'POST',
    token: student.token,
    body: {
      deliverableUrl: 'https://example.test/deliverables/integration',
      deliverableNotes: 'The integration deliverable is ready for verification.',
    },
  });
  assertStatus(submitted, 200);
  assert.equal(submitted.data.data.status, 'submitted');

  const verified = await request(`/milestones/${milestoneResponse.data.data._id}/verify`, {
    method: 'POST',
    token: recruiter.token,
    body: { status: 'verified', feedback: 'Verified by the workspace owner.' },
  });
  assertStatus(verified, 200);
  assert.equal(verified.data.data.progress, 100);
  assert.equal(verified.data.data.portfolio.student.toString(), student.user._id);
  assert.ok(verified.data.data.portfolio.certificateId);

  const ownPortfolios = await request('/portfolios/me', { token: student.token });
  assertStatus(ownPortfolios, 200);
  assert.equal(ownPortfolios.data.data.length, 1);
  assert.equal(ownPortfolios.data.data[0].student._id, student.user._id);
  assert.equal(ownPortfolios.data.data[0].projectTitle, 'Verified Workspace Project');

  const certificateId = ownPortfolios.data.data[0].certificateId;
  const publicPortfolio = await request(`/portfolios/verify/${certificateId}`);
  assertStatus(publicPortfolio, 200);
  assert.equal(publicPortfolio.data.data.student._id, student.user._id);
  assert.equal(publicPortfolio.data.data.student.email, student.user.email);
  assert.equal(publicPortfolio.data.data.projectTitle, 'Verified Workspace Project');
  assert.equal(publicPortfolio.data.data.workspace.project._id, projectResponse.data.data._id);
  assert.equal(publicPortfolio.data.data.verifiedBy._id, recruiter.user._id);
  assert.equal(publicPortfolio.data.data.verifiedBy.role, 'recruiter');
});

integrationTest('implemented application APIs accept a student application and return only that student\'s records', async () => {
  const student = await registerAndLogin('student', 'Application Student');
  const recruiter = await registerAndLogin('recruiter', 'Application Recruiter');

  const project = await request('/projects', {
    method: 'POST',
    token: student.token,
    body: {
      title: 'Application API Project',
      shortDescription: 'A project for the supported application submission endpoint.',
      detailedDescription: 'This verifies the student-side application behavior without inventing recruiter search.',
      category: 'Cloud',
      technologies: ['Node.js', 'Docker'],
    },
  });
  assertStatus(project, 201);

  const application = await request('/applications', {
    method: 'POST',
    token: student.token,
    body: {
      projectId: project.data.data._id,
      projectOpportunityId: project.data.data._id,
      coverLetter: 'I have relevant experience and can contribute to this project immediately.',
    },
  });
  assertStatus(application, 201);
  assert.equal(application.data.data.studentId, student.user._id);
  assert.equal(application.data.data.status, 'Applied');

  const studentApplications = await request('/applications/my', { token: student.token });
  assertStatus(studentApplications, 200);
  assert.equal(studentApplications.data.data.length, 1);
  const applicationRecord = studentApplications.data.data[0];
  const returnedStudentId = applicationRecord.studentId?._id
    || applicationRecord.studentId
    || applicationRecord.student?._id
    || applicationRecord.student;
  const returnedProjectId = applicationRecord.projectOpportunityId?._id
    || applicationRecord.projectOpportunityId
    || applicationRecord.project?._id
    || applicationRecord.project;
  assert.equal(String(returnedStudentId), student.user._id);
  assert.equal(String(returnedProjectId), project.data.data._id);

  const duplicate = await request('/applications', {
    method: 'POST',
    token: student.token,
    body: {
      projectId: project.data.data._id,
      projectOpportunityId: project.data.data._id,
      coverLetter: 'This duplicate submission should be rejected by the API.',
    },
  });
  assertStatus(duplicate, 409);

  const recruiterCannotApply = await request('/applications', {
    method: 'POST',
    token: recruiter.token,
    body: {
      projectId: project.data.data._id,
      projectOpportunityId: project.data.data._id,
      coverLetter: 'Recruiters cannot use the student application endpoint.',
    },
  });
  assertStatus(recruiterCannotApply, 403);
});

integrationTest('critical supported path persists student data through verification and student application status', async () => {
  const student = await registerAndLogin('student', 'Critical Path Student');
  const recruiter = await registerAndLogin('recruiter', 'Critical Path Owner');

  const profile = await request('/profile', {
    method: 'POST',
    token: student.token,
    body: {
      fullName: student.user.fullName,
      college: 'Critical Path University',
      branch: 'Software Engineering',
      graduationYear: 2026,
      skills: ['Node.js', 'MongoDB'],
    },
  });
  assertStatus(profile, 201);

  const project = await request('/projects', {
    method: 'POST',
    token: student.token,
    body: {
      title: 'Critical Path Project',
      shortDescription: 'The supported end-to-end integration path project.',
      detailedDescription: 'It covers student persistence, a workspace milestone, and public verification.',
      category: 'Web Development',
      technologies: ['Node.js', 'MongoDB'],
    },
  });
  assertStatus(project, 201);

  const application = await request('/applications', {
    method: 'POST',
    token: student.token,
    body: {
      projectId: project.data.data._id,
      projectOpportunityId: project.data.data._id,
      coverLetter: 'I am ready to complete the critical path project with tested API behavior.',
    },
  });
  assertStatus(application, 201);

  const workspace = await models.Workspace.create({
    project: project.data.data._id,
    student: student.user._id,
    owner: recruiter.user._id,
    application: application.data.data._id,
  });
  const milestone = await request('/milestones', {
    method: 'POST',
    token: recruiter.token,
    body: {
      workspaceId: workspace._id.toString(),
      title: 'Verify critical path',
      description: 'Verify the critical path milestone through the real route.',
      dueDate: '2026-12-31',
    },
  });
  assertStatus(milestone, 201);

  const submit = await request(`/milestones/${milestone.data.data._id}/submit`, {
    method: 'POST',
    token: student.token,
    body: { deliverableUrl: 'https://example.test/critical-path' },
  });
  assertStatus(submit, 200);
  const verify = await request(`/milestones/${milestone.data.data._id}/verify`, {
    method: 'POST',
    token: recruiter.token,
    body: { status: 'verified' },
  });
  assertStatus(verify, 200);
  assert.equal(verify.data.data.progress, 100);

  const portfolio = await request('/portfolios/me', { token: student.token });
  assertStatus(portfolio, 200);
  assert.equal(portfolio.data.data[0].student._id, student.user._id);

  const applications = await request('/applications/my', { token: student.token });
  assertStatus(applications, 200);
  assert.equal(applications.data.data[0].status, 'Applied');
  assert.equal(await models.Application.countDocuments({ studentId: student.user._id }), 1);
  assert.equal(await models.Portfolio.countDocuments({ student: student.user._id }), 1);
});

test('faculty verification queue and approval/rejection/request-changes transitions are skipped because no verification module is mounted', {
  skip: 'No faculty verification model, route, service, or resubmission implementation exists in this branch',
}, () => {});

test('AI portfolio evaluation is skipped because no AI endpoint or persisted result exists', {
  skip: 'The ai-service workspace is a skeleton and no evaluator route is mounted',
}, () => {});

test('ATS analysis and generated-resume workflow are skipped because neither is implemented', {
  skip: 'The server supports PDF upload only; it has no resume generator or ATS analyzer',
}, () => {});

test('recruiter candidate discovery, verified filtering, and shortlist workflow is skipped', {
  skip: 'No database-backed recruiter discovery or shortlist endpoint exists',
}, () => {});

test('recruiter application status lifecycle is skipped at the management step', {
  skip: 'Existing application management assumes recruiter-owned project opportunities, while projects are student-owned portfolio records',
}, () => {});

test('notification delivery and read-state workflow is skipped', {
  skip: 'No notification model, route, or delivery service exists',
}, () => {});

test('alumni mentorship, endorsement, and referral workflow is skipped', {
  skip: 'No persisted alumni interaction module exists',
}, () => {});

test('admin analytics workflow is skipped', {
  skip: 'The admin dashboard has no database-backed analytics endpoint',
}, () => {});
