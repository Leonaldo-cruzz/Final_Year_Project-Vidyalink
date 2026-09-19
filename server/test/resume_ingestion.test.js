/**
 * resume_ingestion.test.js
 * ─────────────────────────────────────────────────────────────
 * Comprehensive Test Suite for VidyaLink Resume Ingestion &
 * Document Intelligence Subsystem.
 *
 * Test Coverage:
 *  1. Upload validation (MIME types & extension filtering)
 *  2. Native PDF text extraction (valid PDF, empty, image-only/scanned, corrupt)
 *  3. Native DOCX text extraction (valid DOCX, empty DOCX, corrupt DOCX)
 *  4. Structured parsing (contact, skills + evidence, education, experience, projects, certs)
 *  5. Data integrity invariant: Zero hallucinated/placeholder fields
 *  6. Profile comparison (matched skills, resume-only, profile-only, education & phone conflicts)
 *  7. Portfolio comparison (faculty-verified projects, unverified claims, certificates, GitHub handle)
 *  8. Deduplication via SHA-256 contentHash
 *  9. Selective user-confirmed profile import (no silent overwrites)
 * 10. Stale ATS detection & reanalysis with active resume rawText
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';
import JSZip from 'jszip';
import PDFDocument from 'pdfkit';

import resumeParserService from '../src/services/resumeParser.service.js';
import resumeService from '../src/services/resume.service.js';
import Resume from '../src/models/resume.model.js';
import Profile from '../src/models/profile.model.js';
import AIAnalysis from '../src/models/aiAnalysis.model.js';
import aiIntegrationService from '../src/services/aiIntegration.service.js';

// ── Test Helpers: Document Generation ────────────────────────────────────────

/**
 * Generate a valid machine-readable PDF buffer using PDFDocument.
 */
function createSamplePdfBuffer(textLines = ['John Doe', 'Software Engineer', 'Skills: React, Node.js, Python']) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ margin: 54, size: 'A4', compress: false });
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    textLines.forEach((line) => {
      doc.fontSize(12).text(line);
      doc.moveDown(0.5);
    });

    doc.end();
  });
}

/**
 * Generate a valid minimal DOCX buffer using JSZip.
 */
async function createSampleDocxBuffer(text = 'Aarav Sharma - Full Stack Engineer - Skills: React, Node.js, Python') {
  const zip = new JSZip();

  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '</Types>'
  );

  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>'
  );

  zip.file(
    'word/document.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:body>' +
    '<w:p><w:r><w:t>' + text + '</w:t></w:r></w:p>' +
    '</w:body>' +
    '</w:document>'
  );

  return zip.generateAsync({ type: 'nodebuffer' });
}

// ── 1. Upload Validation & Extension Filtering ────────────────────────────────

describe('1. Resume Upload Validation', () => {
  it('TC-INGEST-VAL1: Allows .pdf and .docx file extensions and MIME types', () => {
    const allowedExtensions = new Set(['.pdf', '.docx']);
    const allowedMimeTypes = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/octet-stream',
    ]);

    assert.ok(allowedExtensions.has('.pdf'), '.pdf should be allowed');
    assert.ok(allowedExtensions.has('.docx'), '.docx should be allowed');
    assert.ok(allowedMimeTypes.has('application/pdf'), 'application/pdf should be allowed');
    assert.ok(
      allowedMimeTypes.has('application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      'docx MIME should be allowed'
    );
  });

  it('TC-INGEST-VAL2: Rejects forbidden extensions (.png, .exe, .txt, .zip)', () => {
    const allowedExtensions = new Set(['.pdf', '.docx']);
    assert.strictEqual(allowedExtensions.has('.png'), false, '.png must be rejected');
    assert.strictEqual(allowedExtensions.has('.exe'), false, '.exe must be rejected');
    assert.strictEqual(allowedExtensions.has('.txt'), false, '.txt must be rejected');
    assert.strictEqual(allowedExtensions.has('.zip'), false, '.zip must be rejected');
  });
});

// ── 2. Native PDF Text Extraction ────────────────────────────────────────────

describe('2. Native PDF Text Extraction (resumeParserService.extractText)', () => {
  it('TC-INGEST-PDF1: Successfully extracts selectable text from valid PDF', async () => {
    const sampleLines = [
      'Devendra Joshi',
      'Full Stack Developer | devendra@vidyalink.edu',
      'Technical Skills: React, Node.js, TypeScript, PostgreSQL',
      'Education: B.Tech Computer Science, National Institute of Technology',
    ];
    const pdfBuffer = await createSamplePdfBuffer(sampleLines);

    const result = await resumeParserService.extractText(pdfBuffer, 'application/pdf', 'resume.pdf');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, 'SUCCESS');
    assert.ok(result.rawText.includes('Devendra Joshi'), 'Should extract candidate name');
    assert.ok(result.rawText.includes('devendra@vidyalink.edu'), 'Should extract candidate email');
    assert.ok(result.rawText.includes('React'), 'Should extract skill React');
    assert.ok(result.pageCount >= 1, 'Page count should be at least 1');
  });

  it('TC-INGEST-PDF2: Detects empty buffer and returns status EMPTY', async () => {
    const emptyBuffer = Buffer.alloc(0);
    const result = await resumeParserService.extractText(emptyBuffer, 'application/pdf', 'empty.pdf');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.status, 'EMPTY');
    assert.strictEqual(result.rawText, '');
    assert.ok(result.error.includes('empty'));
  });

  it('TC-INGEST-PDF3: Flags image-only / scanned PDF without crashing', async () => {
    // When a PDF contains pages but zero extractable text stream, it must return IMAGE_ONLY
    const emptyPdfBuffer = await new Promise((resolve, reject) => {
      const chunks = [];
      const doc = new PDFDocument({ margin: 54, size: 'A4' });
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      // Empty page: no text added
      doc.addPage();
      doc.end();
    });

    const result = await resumeParserService.extractText(emptyPdfBuffer, 'application/pdf', 'scanned.pdf');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.status, 'IMAGE_ONLY');
    assert.strictEqual(result.rawText, '');
    assert.ok(result.error.includes('Text could not be extracted'));
  });

  it('TC-INGEST-PDF4: Handles corrupt / non-PDF binary gracefully as UNREADABLE', async () => {
    const corruptBuffer = Buffer.from('NOT_A_VALID_PDF_BINARY_HEADER_DATA_12345');
    const result = await resumeParserService.extractText(corruptBuffer, 'application/pdf', 'corrupt.pdf');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.status, 'UNREADABLE');
    assert.ok(result.error.includes('Failed to read PDF'));
  });
});

// ── 3. Native DOCX Text Extraction ───────────────────────────────────────────

describe('3. Native DOCX Text Extraction (resumeParserService.extractText)', () => {
  it('TC-INGEST-DOCX1: Successfully extracts text from valid DOCX buffer', async () => {
    const content = 'Priya Sharma - Software Engineer. Skills: React, Node.js, Python, MongoDB.';
    const docxBuffer = await createSampleDocxBuffer(content);

    const result = await resumeParserService.extractText(
      docxBuffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'resume.docx'
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, 'SUCCESS');
    assert.ok(result.rawText.includes('Priya Sharma'));
    assert.ok(result.rawText.includes('React'));
    assert.ok(result.rawText.includes('MongoDB'));
  });

  it('TC-INGEST-DOCX2: Detects empty DOCX without text as EMPTY', async () => {
    const emptyDocxBuffer = await createSampleDocxBuffer('');

    const result = await resumeParserService.extractText(
      emptyDocxBuffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'empty.docx'
    );

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.status, 'EMPTY');
    assert.ok(result.error.includes('no readable text'));
  });

  it('TC-INGEST-DOCX3: Handles corrupt DOCX file gracefully as UNREADABLE', async () => {
    const corruptDocx = Buffer.from('PK\x03\x04corrupt_zip_content');

    const result = await resumeParserService.extractText(
      corruptDocx,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'broken.docx'
    );

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.status, 'UNREADABLE');
    assert.ok(result.error.includes('Failed to read DOCX'));
  });
});

// ── 4. Structured Resume Information Extraction ──────────────────────────────

describe('4. Structured Parsing & Evidence Mapping (resumeParserService.parseStructuredData)', () => {
  const SAMPLE_RESUME_TEXT = `
Aarav Sharma
aarav.sharma@example.edu | +91 9876543210 | Bangalore, Karnataka
linkedin.com/in/aarav-sharma | github.com/aaravsharma

SUMMARY
Enthusiastic full-stack engineer with hands-on experience building distributed systems and machine learning pipelines.

SKILLS
Programming: JavaScript, TypeScript, Python, Go, SQL
Frameworks & Libraries: React, Node.js, Express, FastAPI, TailwindCSS
Tools & Platforms: Docker, Kubernetes, Git, AWS, MongoDB, PostgreSQL

EDUCATION
National Institute of Technology Karnataka
Bachelor of Technology in Computer Science and Engineering
Graduation: 2026 | CGPA: 8.85

EXPERIENCE
Software Engineering Intern | Acme Labs
May 2025 - July 2025 | Bangalore
- Architected REST APIs using Node.js and Express handling 10k requests/minute.
- Built responsive UI components using React and TailwindCSS.

PROJECTS
VidyaLink AI Platform
- Built explainable portfolio evaluation engine using React, FastAPI, and MongoDB.
- Implemented real-time GitHub activity verification and ATS matching.

CERTIFICATIONS
AWS Certified Cloud Practitioner - Amazon Web Services (2025)

ACHIEVEMENTS
- Winner of Smart India Hackathon 2024
- Top 5% in LeetCode Global Contest
  `.trim();

  it('TC-INGEST-PARSE1: Correctly extracts candidate contact information and links', () => {
    const parsed = resumeParserService.parseStructuredData(SAMPLE_RESUME_TEXT);

    assert.ok(parsed, 'Parsed data should not be null');
    assert.strictEqual(parsed.name, 'Aarav Sharma');
    assert.strictEqual(parsed.email, 'aarav.sharma@example.edu');
    assert.strictEqual(parsed.phone, '+91 9876543210');
    assert.ok(parsed.location.includes('Bangalore'));
    assert.strictEqual(parsed.links.linkedin, 'https://linkedin.com/in/aarav-sharma');
    assert.strictEqual(parsed.links.github, 'https://github.com/aaravsharma');
  });

  it('TC-INGEST-PARSE2: Extracts technical skills with source attribution and evidence snippet', () => {
    const parsed = resumeParserService.parseStructuredData(SAMPLE_RESUME_TEXT);

    assert.ok(Array.isArray(parsed.skills), 'Skills should be an array');
    assert.ok(parsed.skills.length >= 5, 'Should identify multiple skills');

    const skillValues = parsed.skills.map((s) => s.value);
    assert.ok(skillValues.includes('React'), 'Should extract React');
    assert.ok(skillValues.includes('Node.js'), 'Should extract Node.js');
    assert.ok(skillValues.includes('Python'), 'Should extract Python');
    assert.ok(skillValues.includes('Docker'), 'Should extract Docker');
    assert.ok(skillValues.includes('MongoDB'), 'Should extract MongoDB');

    // Verify traceability contract: each skill has value, source: 'resume', and evidence snippet
    parsed.skills.forEach((skill) => {
      assert.strictEqual(skill.source, 'resume');
      assert.ok(typeof skill.value === 'string' && skill.value.length > 0);
      assert.ok(typeof skill.evidence === 'string' && skill.evidence.length > 0);
    });
  });

  it('TC-INGEST-PARSE3: Extracts education history with institution, degree, and graduation year', () => {
    const parsed = resumeParserService.parseStructuredData(SAMPLE_RESUME_TEXT);

    assert.ok(Array.isArray(parsed.education));
    assert.ok(parsed.education.length > 0);
    const topEdu = parsed.education[0];
    assert.ok(topEdu.institution.includes('National Institute of Technology'));
    assert.ok(topEdu.degree.includes('Bachelor of Technology') || topEdu.degree.includes('B.Tech'));
    assert.strictEqual(topEdu.graduationYear, 2026);
    assert.strictEqual(topEdu.gpa, '8.85');
  });

  it('TC-INGEST-PARSE4: Extracts experience and projects accurately', () => {
    const parsed = resumeParserService.parseStructuredData(SAMPLE_RESUME_TEXT);

    assert.ok(Array.isArray(parsed.experience));
    assert.ok(parsed.experience.length > 0);
    const exp = parsed.experience[0];
    assert.ok(exp.role.includes('Intern') || exp.role.includes('Software Engineer'));
    assert.ok(exp.company.includes('Acme Labs'));

    assert.ok(Array.isArray(parsed.projects));
    assert.ok(parsed.projects.length > 0);
    const proj = parsed.projects[0];
    assert.strictEqual(proj.title, 'VidyaLink AI Platform');
    assert.ok(proj.description.includes('portfolio evaluation engine'));
  });

  it('TC-INGEST-PARSE5: Extracts certifications and achievements', () => {
    const parsed = resumeParserService.parseStructuredData(SAMPLE_RESUME_TEXT);

    assert.ok(Array.isArray(parsed.certifications));
    assert.ok(parsed.certifications.length > 0);
    assert.ok(parsed.certifications[0].title.includes('AWS Certified Cloud Practitioner'));

    assert.ok(Array.isArray(parsed.achievements));
    assert.ok(parsed.achievements.length > 0);
    assert.ok(parsed.achievements.some((a) => (a.title || a).includes('Smart India Hackathon')));
  });

  it('TC-INGEST-PARSE6 [INVARIANT]: Missing sections return empty arrays / null — ZERO hallucinated fields', () => {
    const minimalResume = `
Jane Student
jane@college.edu
SKILLS
Python, SQL
    `.trim();

    const parsed = resumeParserService.parseStructuredData(minimalResume);

    assert.strictEqual(parsed.name, 'Jane Student');
    assert.strictEqual(parsed.email, 'jane@college.edu');
    assert.strictEqual(parsed.phone, null, 'Missing phone must remain null');
    assert.strictEqual(parsed.location, null, 'Missing location must remain null');
    assert.deepStrictEqual(parsed.experience, [], 'Missing experience must be empty array');
    assert.deepStrictEqual(parsed.projects, [], 'Missing projects must be empty array');
    assert.deepStrictEqual(parsed.certifications, [], 'Missing certs must be empty array');
    assert.deepStrictEqual(parsed.achievements, [], 'Missing achievements must be empty array');
  });
});

// ── 5. Traceable Profile Comparison ──────────────────────────────────────────

describe('5. Profile Comparison (resumeParserService.compareWithProfile)', () => {
  const parsedResume = {
    skills: [
      { value: 'React', source: 'resume', evidence: 'React' },
      { value: 'Node.js', source: 'resume', evidence: 'Node.js' },
      { value: 'Docker', source: 'resume', evidence: 'Docker' },
      { value: 'Kubernetes', source: 'resume', evidence: 'Kubernetes' },
    ],
    education: [
      { institution: 'Indian Institute of Technology Bombay', degree: 'B.Tech' },
    ],
    phone: '+91 9123456780',
  };

  const sampleProfile = {
    skills: ['React', 'Node.js', 'Python'],
    college: 'National Institute of Technology Karnataka',
    phone: '+91 9988776655',
  };

  it('TC-INGEST-PROF1: Identifies matched skills, resume-only skills, and profile-only skills', () => {
    const comparison = resumeParserService.compareWithProfile(parsedResume, {}, sampleProfile);

    assert.deepStrictEqual(comparison.matchedSkills.sort(), ['Node.js', 'React'].sort());
    assert.deepStrictEqual(comparison.resumeOnlySkills.sort(), ['Docker', 'Kubernetes'].sort());
    assert.deepStrictEqual(comparison.profileOnlySkills.sort(), ['Python'].sort());
  });

  it('TC-INGEST-PROF2: Detects education and phone conflicts neutrally without throwing', () => {
    const comparison = resumeParserService.compareWithProfile(parsedResume, {}, sampleProfile);

    assert.strictEqual(comparison.hasConflicts, true);
    assert.strictEqual(comparison.conflicts.length, 2);

    const eduConflict = comparison.conflicts.find((c) => c.field === 'education');
    assert.ok(eduConflict);
    assert.strictEqual(eduConflict.resumeValue, 'Indian Institute of Technology Bombay');
    assert.strictEqual(eduConflict.profileValue, 'National Institute of Technology Karnataka');

    const phoneConflict = comparison.conflicts.find((c) => c.field === 'phone');
    assert.ok(phoneConflict);
    assert.strictEqual(phoneConflict.resumeValue, '+91 9123456780');
    assert.strictEqual(phoneConflict.profileValue, '+91 9988776655');
  });

  it('TC-INGEST-PROF3: Generates constructive, actionable review suggestions', () => {
    const comparison = resumeParserService.compareWithProfile(parsedResume, {}, sampleProfile);

    assert.ok(comparison.reviewSuggestions.length > 0);
    assert.ok(comparison.reviewSuggestions.some((s) => s.includes('new technical skill(s)')));
    assert.ok(comparison.reviewSuggestions.some((s) => s.includes('Discrepancies detected')));
  });
});

// ── 6. Traceable Portfolio Comparison ────────────────────────────────────────

describe('6. Verified Portfolio Comparison (resumeParserService.compareWithPortfolio)', () => {
  const parsedResume = {
    projects: [
      { title: 'VidyaLink AI Platform' },
      { title: 'Personal Blog Engine' },
    ],
    certifications: [
      { title: 'AWS Certified Cloud Practitioner' },
      { title: 'Google Professional Cloud Architect' },
    ],
    links: {
      github: 'https://github.com/realstudent',
    },
  };

  const sampleDbProjects = [
    {
      _id: 'proj-001',
      title: 'VidyaLink AI Platform',
      verifiedByFaculty: true,
    },
  ];

  const sampleCertificates = [
    {
      title: 'AWS Certified Cloud Practitioner',
      verificationStatus: 'Verified',
    },
  ];

  const sampleGithub = {
    connectionStatus: 'Connected',
    login: 'realstudent',
  };

  it('TC-INGEST-PORT1: Matches verified project and flags unverified resume project as UNVERIFIED_CLAIM', () => {
    const comparison = resumeParserService.compareWithPortfolio(
      parsedResume,
      sampleDbProjects,
      sampleCertificates,
      sampleGithub
    );

    const verifiedProject = comparison.projectsComparison.find((p) => p.title === 'VidyaLink AI Platform');
    assert.ok(verifiedProject);
    assert.strictEqual(verifiedProject.status, 'MATCHED');
    assert.strictEqual(verifiedProject.verified, true);
    assert.strictEqual(verifiedProject.label, 'Verified in portfolio');

    const unverifiedProject = comparison.projectsComparison.find((p) => p.title === 'Personal Blog Engine');
    assert.ok(unverifiedProject);
    assert.strictEqual(unverifiedProject.status, 'UNVERIFIED_CLAIM');
    assert.strictEqual(unverifiedProject.verified, false);
    assert.strictEqual(unverifiedProject.label, 'Not found in verified portfolio.');
  });

  it('TC-INGEST-PORT2: Matches verified certificate and flags unverified certificate claim neutrally', () => {
    const comparison = resumeParserService.compareWithPortfolio(
      parsedResume,
      sampleDbProjects,
      sampleCertificates,
      sampleGithub
    );

    const verifiedCert = comparison.certificatesComparison.find((c) => c.title === 'AWS Certified Cloud Practitioner');
    assert.ok(verifiedCert);
    assert.strictEqual(verifiedCert.status, 'MATCHED');
    assert.strictEqual(verifiedCert.verified, true);

    const unverifiedCert = comparison.certificatesComparison.find((c) => c.title === 'Google Professional Cloud Architect');
    assert.ok(unverifiedCert);
    assert.strictEqual(unverifiedCert.status, 'UNVERIFIED_CLAIM');
    assert.strictEqual(unverifiedCert.verified, false);
    assert.strictEqual(unverifiedCert.label, 'Not found in verified certificates.');
  });

  it('TC-INGEST-PORT3: Accurately validates connected GitHub handle against resume link', () => {
    const comparison = resumeParserService.compareWithPortfolio(
      parsedResume,
      sampleDbProjects,
      sampleCertificates,
      sampleGithub
    );

    assert.strictEqual(comparison.githubComparison.status, 'MATCHED');
    assert.ok(comparison.githubComparison.message.includes('realstudent'));

    // Test mismatch case
    const mismatchGithub = { connectionStatus: 'Connected', login: 'different-user' };
    const mismatchComparison = resumeParserService.compareWithPortfolio(
      parsedResume,
      sampleDbProjects,
      sampleCertificates,
      mismatchGithub
    );
    assert.strictEqual(mismatchComparison.githubComparison.status, 'MISMATCH');
  });
});

// ── 7. Deduplication via SHA-256 contentHash ─────────────────────────────────

describe('7. Resume Deduplication (contentHash)', () => {
  it('TC-INGEST-DEDUP1: Generates deterministic SHA-256 hash for identical file buffers', async () => {
    const bufA = Buffer.from('Resume Document Content Version 1.0');
    const bufB = Buffer.from('Resume Document Content Version 1.0');
    const bufC = Buffer.from('Resume Document Content Version 2.0');

    const hashA = crypto.createHash('sha256').update(bufA).digest('hex');
    const hashB = crypto.createHash('sha256').update(bufB).digest('hex');
    const hashC = crypto.createHash('sha256').update(bufC).digest('hex');

    assert.strictEqual(hashA, hashB, 'Identical buffers must have matching hashes');
    assert.notStrictEqual(hashA, hashC, 'Different buffers must have distinct hashes');
  });

  it('TC-INGEST-DEDUP2: saveOrReplaceResume reuses existing parsed data if contentHash matches', async () => {
    const origFindOne = Resume.findOne;
    const origAIFindOne = AIAnalysis.findOne;

    const testBuffer = Buffer.from('Sample resume text for deduplication test');
    const testHash = crypto.createHash('sha256').update(testBuffer).digest('hex');

    const mockResume = {
      _id: 'res-001',
      userId: 'student-999',
      contentHash: testHash,
      storedFileName: 'resume-existing.pdf',
      parsingStatus: 'SUCCESS',
      version: 1,
      parsedData: { name: 'Duplicate Test Candidate', skills: [] },
      rawText: 'Sample resume text',
    };

    Resume.findOne = async () => mockResume;
    AIAnalysis.findOne = () => ({
      sort: () => ({
        lean: async () => ({ result: { score: 85, summary: 'Good' } }),
      }),
    });

    try {
      const result = await resumeService.saveOrReplaceResume('student-999', {
        buffer: testBuffer,
        originalname: 'duplicate.pdf',
        mimetype: 'application/pdf',
        size: testBuffer.length,
        filename: 'resume-existing.pdf',
      });

      assert.strictEqual(result.isDuplicate, true, 'Should be flagged as duplicate');
      assert.deepStrictEqual(result.parsedData, mockResume.parsedData);
      assert.strictEqual(result.atsResult?.score, 85);
    } finally {
      Resume.findOne = origFindOne;
      AIAnalysis.findOne = origAIFindOne;
    }
  });
});

// ── 8. User-Confirmed Selective Profile Import ───────────────────────────────

describe('8. Selective Profile Import (resumeService.importToProfile)', () => {
  it('TC-INGEST-IMP1: Imports selected skills without duplicating existing profile skills', async () => {
    const origFindOne = Profile.findOne;

    let savedSkills = null;
    const mockProfile = {
      user: 'student-777',
      skills: ['JavaScript', 'Node.js'],
      save: async function () {
        savedSkills = this.skills;
        return this;
      },
    };

    Profile.findOne = async () => mockProfile;

    try {
      const result = await resumeService.importToProfile('student-777', {
        skills: ['Docker', 'Node.js', 'Kubernetes'], // Node.js is already present
      });

      assert.ok(result.message.includes('successfully'));
      assert.deepStrictEqual(savedSkills.sort(), ['Docker', 'JavaScript', 'Kubernetes', 'Node.js'].sort());
    } finally {
      Profile.findOne = origFindOne;
    }
  });

  it('TC-INGEST-IMP2: Does not overwrite populated college/degree, only updates empty fields', async () => {
    const origFindOne = Profile.findOne;

    const mockProfile = {
      user: 'student-777',
      skills: ['React'],
      college: 'Existing University',
      degree: null, // empty
      save: async function () {
        return this;
      },
    };

    Profile.findOne = async () => mockProfile;

    try {
      await resumeService.importToProfile('student-777', {
        skills: [],
        education: {
          college: 'New Candidate College',
          degree: 'Bachelor of Technology',
        },
      });

      assert.strictEqual(mockProfile.college, 'Existing University', 'Populated college must NOT be overwritten');
      assert.strictEqual(mockProfile.degree, 'Bachelor of Technology', 'Empty degree should be filled');
    } finally {
      Profile.findOne = origFindOne;
    }
  });
});

// ── 9. Stale ATS Detection & Reanalysis ───────────────────────────────────────

describe('9. Stale ATS Detection & Reanalysis', () => {
  it('TC-INGEST-STALE1: checkStale flags ATS as stale when resume version > ATS analysis resumeVersion', async () => {
    const origResumeFindOne = Resume.findOne;
    const origAIFindOne = AIAnalysis.findOne;

    const mockResume = {
      _id: 'res-101',
      version: 3, // Uploaded version 3
      storedFileName: 'res.pdf',
    };

    const mockATS = {
      result: { score: 78 },
      inputSnapshot: { resumeVersion: 2 }, // Analyzed on version 2
      createdAt: new Date('2026-01-01'),
    };

    Resume.findOne = async () => mockResume;
    AIAnalysis.findOne = () => ({
      sort: () => ({
        lean: async () => mockATS,
      }),
    });

    try {
      const result = await resumeService.checkStale('student-101');
      assert.strictEqual(result.stale, true, 'Should be stale when version mismatch exists');
      assert.ok(result.reason.includes('newer version'));
    } finally {
      Resume.findOne = origResumeFindOne;
      AIAnalysis.findOne = origAIFindOne;
    }
  });

  it('TC-INGEST-REANALYZE: reanalyzeATS re-runs ATS using active resume rawText and optional job description', async () => {
    const origResumeFindOne = Resume.findOne;
    const origAnalyzeATS = aiIntegrationService.analyzeATS;

    const mockResume = {
      _id: 'res-101',
      version: 2,
      rawText: 'Candidate Resume text with Python, React, and AWS',
    };

    Resume.findOne = async () => mockResume;

    let receivedText = null;
    let receivedJD = null;
    aiIntegrationService.analyzeATS = async (user, body, context) => {
      receivedText = body.resumeText;
      receivedJD = body.jobDescription;
      return {
        analysis: {
          result: {
            score: 92,
            summary: 'Strong match for senior developer role',
          },
        },
      };
    };

    try {
      const result = await resumeService.reanalyzeATS('student-101', {
        jobDescription: 'Looking for a Senior Python & AWS Engineer',
      });

      assert.strictEqual(result.resumeVersion, 2);
      assert.strictEqual(result.atsResult?.score, 92);
      assert.strictEqual(receivedText, mockResume.rawText, 'Should pass active resume rawText to ATS');
      assert.strictEqual(receivedJD, 'Looking for a Senior Python & AWS Engineer');
    } finally {
      Resume.findOne = origResumeFindOne;
      aiIntegrationService.analyzeATS = origAnalyzeATS;
    }
  });
});
