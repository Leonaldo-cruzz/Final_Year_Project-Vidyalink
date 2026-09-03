import assert from 'node:assert/strict';
import test from 'node:test';
import authorize from '../middleware/role.middleware.js';
import { registerSchema } from '../validators/auth.validator.js';
import { createProjectSchema } from '../validators/project.validator.js';
import { createCertificateSchema } from '../validators/certificate.validator.js';

test('registration validation accepts supported roles and rejects public admin registration', () => {
  const valid = registerSchema.safeParse({
    body: { fullName: 'Student One', email: 'student@example.com', password: 'Strong1!Password', role: 'student' },
  });
  const invalid = registerSchema.safeParse({
    body: { fullName: 'Admin User', email: 'admin@example.com', password: 'Strong1!Password', role: 'admin' },
  });
  assert.equal(valid.success, true);
  assert.equal(invalid.success, false);
});

test('role authorization consistently returns 401 without a user and 403 for a wrong role', () => {
  const studentOnly = authorize('student');
  assert.throws(() => studentOnly({}, {}, () => {}), { statusCode: 401 });
  assert.throws(() => studentOnly({ user: { role: 'faculty' } }, {}, () => {}), { statusCode: 403 });
  let proceeded = false;
  studentOnly({ user: { role: 'student' } }, {}, () => { proceeded = true; });
  assert.equal(proceeded, true);
});

test('project validation normalizes multipart technology lists and rejects incomplete portfolio claims', () => {
  const valid = createProjectSchema.safeParse({
    body: {
      title: 'Portfolio API',
      shortDescription: 'An API for verified student portfolios.',
      detailedDescription: 'An API that stores verified student portfolio information securely.',
      category: 'Web Development',
      technologies: '["Node.js", "React", "Node.js"]',
    },
  });
  const invalid = createProjectSchema.safeParse({ body: { title: 'Too short' } });
  assert.equal(valid.success, true);
  assert.deepEqual(valid.data.body.technologies, ['Node.js', 'React']);
  assert.equal(invalid.success, false);
});

test('certificate validation rejects malformed credential URLs', () => {
  const valid = createCertificateSchema.safeParse({ title: 'Cloud Foundations', issuer: 'Example Academy', issueDate: '2026-01-01', credentialUrl: 'https://example.edu/credential' });
  const invalid = createCertificateSchema.safeParse({ title: 'Cloud Foundations', issuer: 'Example Academy', issueDate: '2026-01-01', credentialUrl: 'javascript:alert(1)' });
  assert.equal(valid.success, true);
  assert.equal(invalid.success, false);
});
