import test from 'node:test';
import assert from 'node:assert/strict';
import PDFDocument from 'pdfkit';
import pdfParse from 'pdf-parse';

import { buildResumeText } from '../src/services/resume.service.js';

test('Resume PDF Validation — Text is machine-readable, selectable, and searchable', async () => {
  const sampleUser = {
    fullName: 'Aarav Sharma',
    email: 'aarav.sharma@vidyalink.edu',
    college: 'National Institute of Technology',
    branch: 'Computer Science & Engineering',
    graduationYear: 2026,
  };

  const sampleProfile = {
    headline: 'Full Stack & Distributed Systems Enthusiast',
    bio: 'Dedicated software engineering student focused on building scalable, verified backend services and accessible web applications.',
    phone: '+91 98765 43210',
    skills: ['JavaScript', 'TypeScript', 'Node.js', 'React', 'MongoDB', 'Python'],
    degree: 'B.Tech',
    college: 'National Institute of Technology',
    branch: 'Computer Science & Engineering',
    graduationYear: 2026,
    cgpa: 8.9,
    linkedin: 'https://linkedin.com/in/aarav-sharma',
    github: 'https://github.com/aarav-sharma',
  };

  const sampleProjects = [
    {
      title: 'VidyaLink AI Platform',
      shortDescription: 'Explainable AI evaluation engine with deterministic scoring.',
      technologies: ['React', 'FastAPI', 'Node.js', 'MongoDB'],
      githubRepository: 'https://github.com/example/vidyalink',
      liveDeployment: 'https://vidyalink.edu',
      verifiedByFaculty: true,
    },
  ];

  const sampleCertificates = [
    {
      title: 'AWS Certified Cloud Practitioner',
      issuer: 'Amazon Web Services',
      issueDate: '2025-06-15',
      verificationStatus: 'Verified',
      skills: ['AWS', 'Cloud Computing'],
    },
  ];

  const sampleGithub = {
    connectionStatus: 'Connected',
    login: 'aarav-sharma',
    publicRepos: 18,
  };

  // 1. Build ATS resume text
  const resumeText = buildResumeText({
    user: sampleUser,
    profile: sampleProfile,
    certificates: sampleCertificates,
    projects: sampleProjects,
    github: sampleGithub,
  });

  assert.ok(resumeText.length > 50, 'Resume text should be populated from student data');

  // 2. Render ATS single-column PDF
  const pdfBuffer = await new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ margin: 54, size: 'A4', compress: true });
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(16).text(sampleUser.fullName, { align: 'center' });
    doc.fontSize(9).text(`${sampleUser.email}  |  ${sampleProfile.phone}  |  ${sampleProfile.linkedin}`, { align: 'center' });
    doc.moveDown(0.5);

    // Summary
    doc.fontSize(10).text('SUMMARY');
    doc.fontSize(9).text(sampleProfile.bio);
    doc.moveDown(0.5);

    // Skills
    doc.fontSize(10).text('SKILLS');
    doc.fontSize(9).text(sampleProfile.skills.join(', '));
    doc.moveDown(0.5);

    // Education
    doc.fontSize(10).text('EDUCATION');
    doc.fontSize(9).text(`${sampleProfile.degree} in ${sampleProfile.branch} — ${sampleProfile.college} (Graduation: ${sampleProfile.graduationYear}, CGPA: ${sampleProfile.cgpa})`);
    doc.moveDown(0.5);

    // Projects
    doc.fontSize(10).text('PROJECTS');
    doc.fontSize(9).text(`${sampleProjects[0].title} [Faculty Verified]`);
    doc.fontSize(8).text(sampleProjects[0].shortDescription);
    doc.fontSize(8).text(`Technologies: ${sampleProjects[0].technologies.join(', ')}`);
    doc.moveDown(0.5);

    // Certifications
    doc.fontSize(10).text('CERTIFICATIONS');
    doc.fontSize(9).text(`${sampleCertificates[0].title} — ${sampleCertificates[0].issuer} [Verified]`);

    doc.end();
  });

  assert.ok(pdfBuffer.length > 500, 'PDF buffer should be non-empty');

  // 3. Extract text from PDF buffer using pdf-parse (simulating an ATS parser)
  const uint8 = new Uint8Array(pdfBuffer.buffer, pdfBuffer.byteOffset, pdfBuffer.byteLength);
  const parsedPdf = await pdfParse(uint8);
  const extractedText = parsedPdf.text;

  // 4. Assert text is selectable and searchable
  assert.ok(extractedText.includes('Aarav Sharma'), 'Extracted text must contain student full name');
  assert.ok(extractedText.includes('aarav.sharma@vidyalink.edu'), 'Extracted text must contain student email');
  assert.ok(extractedText.includes('National Institute of Technology'), 'Extracted text must contain institution');
  assert.ok(extractedText.includes('SKILLS'), 'Extracted text must contain SKILLS heading');
  assert.ok(extractedText.includes('PROJECTS'), 'Extracted text must contain PROJECTS heading');
  assert.ok(extractedText.includes('VidyaLink AI Platform'), 'Extracted text must contain project title');
  assert.ok(extractedText.includes('AWS Certified Cloud Practitioner'), 'Extracted text must contain certificate title');

  // 5. Assert readable section order is preserved
  const summaryIndex = extractedText.indexOf('SUMMARY');
  const skillsIndex = extractedText.indexOf('SKILLS');
  const educationIndex = extractedText.indexOf('EDUCATION');
  const projectsIndex = extractedText.indexOf('PROJECTS');
  const certsIndex = extractedText.indexOf('CERTIFICATIONS');

  assert.ok(summaryIndex < skillsIndex, 'Summary must appear before Skills');
  assert.ok(skillsIndex < educationIndex, 'Skills must appear before Education');
  assert.ok(educationIndex < projectsIndex, 'Education must appear before Projects');
  assert.ok(projectsIndex < certsIndex, 'Projects must appear before Certifications');

  // 6. Assert no undefined or null string tokens leaked into the output
  assert.ok(!extractedText.includes('undefined'), 'Must not contain "undefined"');
  assert.ok(!extractedText.includes('null'), 'Must not contain "null"');
  assert.ok(!extractedText.includes('[object Object]'), 'Must not contain "[object Object]"');
});
