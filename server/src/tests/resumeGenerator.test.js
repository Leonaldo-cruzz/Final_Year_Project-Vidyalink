import assert from 'node:assert/strict';
import test from 'node:test';
import resumeGeneratorService from '../services/resumeGenerator.service.js';
import { generateResumeSchema } from '../validators/generatedResume.validator.js';
import { createResumePdf } from '../utils/resumePdf.util.js';

const user = { fullName: 'Asha Sharma', email: 'asha@example.com' };
const profile = {
  fullName: 'Asha Sharma', phone: '+919999999999', headline: 'Computer Science Student', bio: 'Interested in reliable web applications.',
  degree: 'B.Tech', branch: 'Computer Science', college: 'Vidya Institute', graduationYear: 2027, cgpa: 8.7,
  skills: ['JavaScript', 'React'], linkedin: 'https://linkedin.com/in/asha', github: 'https://github.com/asha',
};
const project = { title: 'Campus Hub', category: 'Web Development', projectStatus: 'Completed', shortDescription: 'A student collaboration portal.', technologies: ['React', 'Node.js'], githubRepository: 'https://github.com/asha/campus-hub' };
const certificate = { title: 'Cloud Foundations', issuer: 'Example Academy', issueDate: '2026-05-01', skills: ['AWS'], credentialId: 'ABC-123' };
const input = { targetRole: 'Full Stack Developer', requiredSkills: ['React', 'Node.js'], preferredSkills: ['AWS'], selectedSections: ['summary', 'skills', 'education', 'projects', 'certifications', 'links'], selectedProjectIds: [], selectedCertificateIds: [] };

test('buildContent preserves verified source facts and includes only non-empty requested sections', () => {
  const content = resumeGeneratorService.buildContent({ user, profile, projects: [project], certificates: [certificate], input });
  assert.equal(content.header.name, 'Asha Sharma');
  assert.deepEqual(Object.keys(content.sections), ['Professional Summary', 'Technical Skills', 'Education', 'Projects', 'Certifications', 'Links']);
  assert.match(content.sections.Projects.items[0].bullets.join(' '), /A student collaboration portal/);
  assert.doesNotMatch(JSON.stringify(content), /40%|improved performance/i);
});

test('partial records do not create empty experience or achievement sections', () => {
  const content = resumeGeneratorService.buildContent({ user, profile: { fullName: 'Asha Sharma', skills: [] }, projects: [], certificates: [], input: { ...input, selectedSections: ['experience', 'achievements'] } });
  assert.deepEqual(content.sections, {});
});

test('request validation rejects malformed source IDs', () => {
  const result = generateResumeSchema.safeParse({ body: { ...input, selectedProjectIds: ['not-an-id'] } });
  assert.equal(result.success, false);
});

test('PDF output has a valid header and contains selectable resume text', () => {
  const content = resumeGeneratorService.buildContent({ user, profile, projects: [project], certificates: [], input });
  const pdf = createResumePdf(content).toString('latin1');
  assert.match(pdf, /^%PDF-1.4/);
  assert.match(pdf, /Asha Sharma/);
  assert.match(pdf, /Campus Hub/);
});
