/**
 * resume.service.js
 * ─────────────────────────────────────────────────────────────
 * Handles:
 *  1. PDF upload / replace  (existing)
 *  2. PDF generation from real student profile data (new)
 *  3. ATS-safe resume text assembly (new)
 *  4. Stale detection (new)
 *  5. Fetching resume with latest ATS result (new)
 *
 * Product truth invariants:
 *  - Only real database fields are used; missing fields are omitted.
 *  - No fallback strings, fake names, or fabricated achievements.
 *  - All generated content is traceable to a specific source snapshot.
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import PDFDocument from 'pdfkit';

import AIAnalysis from '../models/aiAnalysis.model.js';
import Certificate from '../models/certificate.model.js';
import GitHubAccount from '../models/githubAccount.model.js';
import Portfolio from '../models/portfolio.model.js';
import Profile from '../models/profile.model.js';
import Project from '../models/project.model.js';
import Resume from '../models/resume.model.js';
import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';
import { RESUME_DIRECTORY, RESUME_PUBLIC_PATH } from '../middleware/resumeUpload.middleware.js';
import aiIntegrationService from './aiIntegration.service.js';
import resumeParserService from './resumeParser.service.js';

const GENERATION_VERSION = '1.0.0';

// ── Snapshot ─────────────────────────────────────────────────────────────────

/**
 * Compute a deterministic SHA-256 over the fields that, if changed,
 * would make the generated resume stale.
 */
const computeSourceSnapshot = (user, profile, certificates, projects, github) => {
  const canonical = JSON.stringify({
    u: { fullName: user.fullName, college: user.college, branch: user.branch, graduationYear: user.graduationYear },
    p: profile ? {
      headline: profile.headline, bio: profile.bio, phone: profile.phone,
      skills: (profile.skills || []).slice().sort(),
      interests: (profile.interests || []).slice().sort(),
      cgpa: profile.cgpa, degree: profile.degree,
      linkedin: profile.linkedin, github: profile.github,
    } : null,
    c: certificates.map((c) => ({ t: c.title, i: c.issuer, d: c.issueDate })).sort((a, b) => a.t.localeCompare(b.t)),
    j: projects.map((p) => ({ t: p.title, tech: (p.technologies || []).slice().sort() })).sort((a, b) => a.t.localeCompare(b.t)),
    g: github?.connectionStatus === 'Connected' ? github.login : null,
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
};

// ── Resume text assembly ──────────────────────────────────────────────────────

/**
 * Build an ordered, ATS-safe resume text representation.
 * Sections with no data are silently omitted.
 * No fake or fabricated content is ever added.
 */
export const buildResumeText = ({
  user, profile, certificates, projects, github, sections = {},
}) => {
  const include = (section) => sections[section] !== false; // default include unless explicitly excluded
  const lines = [];

  // ── Contact ──────────────────────────────────────────────────────────────
  if (include('contact')) {
    if (user.fullName) lines.push(user.fullName);
    if (user.email)    lines.push(user.email);
    if (profile?.phone) lines.push(profile.phone);

    const links = [];
    if (profile?.linkedin) links.push(profile.linkedin);
    if (profile?.github)   links.push(profile.github);
    if (links.length)     lines.push(links.join('  |  '));

    lines.push(''); // blank line after header block
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  if (include('summary') && profile?.bio) {
    lines.push('SUMMARY');
    lines.push(profile.bio.trim());
    lines.push('');
  }

  // ── Skills ────────────────────────────────────────────────────────────────
  const allSkills = [
    ...(profile?.skills || []),
    ...certificates.flatMap((c) => c.skills || []),
  ];
  const uniqueSkills = [...new Set(allSkills)].filter(Boolean);

  if (include('skills') && uniqueSkills.length > 0) {
    lines.push('SKILLS');
    lines.push(uniqueSkills.join(', '));
    lines.push('');
  }

  // ── Education ─────────────────────────────────────────────────────────────
  if (include('education')) {
    const college = profile?.college || user.college;
    const degree = profile?.degree;
    const branch = profile?.branch || user.branch;
    const gradYear = profile?.graduationYear || user.graduationYear;
    const cgpa = profile?.cgpa;

    if (college || degree || branch) {
      lines.push('EDUCATION');
      if (degree && branch) {
        lines.push(`${degree} in ${branch}`);
      } else if (branch) {
        lines.push(branch);
      }
      if (college) lines.push(college);
      const details = [];
      if (gradYear)    details.push(`Graduation: ${gradYear}`);
      if (cgpa !== null && cgpa !== undefined) details.push(`CGPA: ${cgpa}`);
      if (details.length) lines.push(details.join('  |  '));
      lines.push('');
    }
  }

  // ── Projects ──────────────────────────────────────────────────────────────
  if (include('projects') && projects.length > 0) {
    lines.push('PROJECTS');
    for (const project of projects) {
      const parts = [project.title];
      if (project.verifiedByFaculty) parts.push('[Faculty Verified]');
      lines.push(parts.join(' '));
      if (project.shortDescription) lines.push(`- ${project.shortDescription}`);
      if (project.technologies?.length) {
        lines.push(`- Technologies: ${project.technologies.join(', ')}`);
      }
      const links = [];
      if (project.githubRepository) links.push(`GitHub: ${project.githubRepository}`);
      if (project.liveDeployment)    links.push(`Live: ${project.liveDeployment}`);
      if (links.length) lines.push(`- ${links.join('  |  ')}`);
      lines.push('');
    }
  }

  // ── Certifications ────────────────────────────────────────────────────────
  if (include('certifications') && certificates.length > 0) {
    lines.push('CERTIFICATIONS');
    for (const cert of certificates) {
      const issueDateStr = cert.issueDate
        ? new Date(cert.issueDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'short' })
        : null;
      const parts = [cert.title];
      if (cert.issuer) parts.push(`- ${cert.issuer}`);
      if (issueDateStr) parts.push(`(${issueDateStr})`);
      if (cert.verificationStatus === 'Verified') parts.push('[Verified]');
      lines.push(parts.join(' '));
    }
    lines.push('');
  }

  // ── GitHub ────────────────────────────────────────────────────────────────
  if (include('github') && github?.connectionStatus === 'Connected') {
    const githubLines = [];
    if (github.login)       githubLines.push(`GitHub: https://github.com/${github.login}`);
    if (github.publicRepos !== null && github.publicRepos !== undefined) githubLines.push(`Public Repositories: ${github.publicRepos}`);
    if (githubLines.length) {
      lines.push('GITHUB');
      githubLines.forEach((l) => lines.push(l));
      lines.push('');
    }
  }

  return lines.join('\n').trim();
};

// ── PDF generation ────────────────────────────────────────────────────────────

const FONT_REGULAR = 'Helvetica';
const FONT_BOLD    = 'Helvetica-Bold';

/**
 * Renders an ATS-safe single-column PDF from the resume text representation.
 * Uses pdfkit with standard fonts (embedded), no images, no decorative elements.
 * Returns a Buffer of the generated PDF bytes.
 */
const generatePDF = ({
  user, profile, certificates, projects, github, sections,
}) => new Promise((resolve, reject) => {
  const chunks = [];
  const doc = new PDFDocument({ margin: 54, size: 'A4', compress: true });

  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  const PAGE_WIDTH = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const include = (section) => sections[section] !== false;

  const sectionHeader = (title) => {
    doc.moveDown(0.3);
    doc.font(FONT_BOLD).fontSize(9).text(title.toUpperCase(), { characterSpacing: 1.2 });
    doc.moveTo(doc.page.margins.left, doc.y)
       .lineTo(doc.page.margins.left + PAGE_WIDTH, doc.y)
       .strokeColor('#cccccc').lineWidth(0.5).stroke();
    doc.moveDown(0.25);
    doc.font(FONT_REGULAR).fontSize(10);
  };

  const line = (text, opts = {}) => {
    if (text) doc.text(text, { lineGap: 1.5, ...opts });
  };

  // ── Name / Contact ────────────────────────────────────────────────────────
  if (include('contact')) {
    doc.font(FONT_BOLD).fontSize(18).text(user.fullName || '', { align: 'center' });
    doc.font(FONT_REGULAR).fontSize(9);

    const contactParts = [user.email].filter(Boolean);
    if (profile?.phone) contactParts.push(profile.phone);
    if (contactParts.length) doc.text(contactParts.join('  |  '), { align: 'center', lineGap: 2 });

    const linkParts = [];
    if (profile?.linkedin) linkParts.push(profile.linkedin);
    if (profile?.github)   linkParts.push(profile.github);
    if (linkParts.length)  doc.text(linkParts.join('  |  '), { align: 'center', lineGap: 2 });

    doc.moveDown(0.5);
    doc.moveTo(doc.page.margins.left, doc.y)
       .lineTo(doc.page.margins.left + PAGE_WIDTH, doc.y)
       .strokeColor('#999999').lineWidth(1).stroke();
    doc.moveDown(0.3);
  }

  doc.font(FONT_REGULAR).fontSize(10);

  // ── Summary ───────────────────────────────────────────────────────────────
  if (include('summary') && profile?.bio) {
    sectionHeader('Summary');
    line(profile.bio.trim(), { lineGap: 2 });
    doc.moveDown(0.4);
  }

  // ── Skills ────────────────────────────────────────────────────────────────
  const allSkills = [
    ...(profile?.skills || []),
    ...certificates.flatMap((c) => c.skills || []),
  ];
  const uniqueSkills = [...new Set(allSkills)].filter(Boolean);

  if (include('skills') && uniqueSkills.length > 0) {
    sectionHeader('Skills');
    line(uniqueSkills.join('  •  '), { lineGap: 2 });
    doc.moveDown(0.4);
  }

  // ── Education ─────────────────────────────────────────────────────────────
  if (include('education')) {
    const college = profile?.college || user.college;
    const degree = profile?.degree;
    const branch = profile?.branch || user.branch;
    const gradYear = profile?.graduationYear || user.graduationYear;
    const cgpa = profile?.cgpa;

    if (college || degree || branch) {
      sectionHeader('Education');
      if (degree && branch) {
        doc.font(FONT_BOLD).fontSize(10).text(`${degree} in ${branch}`);
        doc.font(FONT_REGULAR).fontSize(10);
      } else if (branch) {
        doc.font(FONT_BOLD).fontSize(10).text(branch);
        doc.font(FONT_REGULAR).fontSize(10);
      }
      if (college) line(college);
      const details = [];
      if (gradYear)     details.push(`Graduation: ${gradYear}`);
      if (cgpa !== null && cgpa !== undefined) details.push(`CGPA: ${cgpa}`);
      if (details.length) line(details.join('  |  '), { color: '#555555' });
      doc.moveDown(0.4);
    }
  }

  // ── Projects ──────────────────────────────────────────────────────────────
  if (include('projects') && projects.length > 0) {
    sectionHeader('Projects');
    for (const project of projects) {
      doc.font(FONT_BOLD).fontSize(10).text(project.title + (project.verifiedByFaculty ? '  [Faculty Verified]' : ''));
      doc.font(FONT_REGULAR).fontSize(10);
      if (project.shortDescription) line(`- ${project.shortDescription}`, { lineGap: 1.5 });
      if (project.technologies?.length) {
        line(`- Technologies: ${project.technologies.join(', ')}`, { lineGap: 1.5 });
      }
      const links = [];
      if (project.githubRepository) links.push(`GitHub: ${project.githubRepository}`);
      if (project.liveDeployment)   links.push(`Live: ${project.liveDeployment}`);
      if (links.length) line(`- ${links.join('  |  ')}`, { lineGap: 1.5 });
      doc.moveDown(0.3);
    }
    doc.moveDown(0.1);
  }

  // ── Certifications ────────────────────────────────────────────────────────
  if (include('certifications') && certificates.length > 0) {
    sectionHeader('Certifications');
    for (const cert of certificates) {
      const issueDateStr = cert.issueDate
        ? new Date(cert.issueDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'short' })
        : null;
      const titleParts = [cert.title];
      if (cert.issuer) titleParts.push(`— ${cert.issuer}`);
      if (cert.verificationStatus === 'Verified') titleParts.push('[Verified]');
      doc.font(FONT_BOLD).fontSize(10).text(titleParts.join(' '));
      doc.font(FONT_REGULAR).fontSize(10);
      if (issueDateStr) line(issueDateStr, { color: '#555555' });
      doc.moveDown(0.2);
    }
    doc.moveDown(0.2);
  }

  // ── GitHub ────────────────────────────────────────────────────────────────
  if (include('github') && github?.connectionStatus === 'Connected') {
    const githubLines = [];
    if (github.login)              githubLines.push(`GitHub: https://github.com/${github.login}`);
    if (github.publicRepos !== null && github.publicRepos !== undefined) githubLines.push(`Public Repositories: ${github.publicRepos}`);
    if (githubLines.length) {
      sectionHeader('GitHub');
      githubLines.forEach((l) => line(l));
      doc.moveDown(0.4);
    }
  }

  doc.end();
});

// ── Main service class ────────────────────────────────────────────────────────

class ResumeService {
  /** Upload or replace student's resume (PDF or DOCX), extracting text, parsing data, and auto-running ATS. */
  async saveOrReplaceResume(userId, file) {
    if (!file) throw ApiError.badRequest('Please select a PDF or DOCX file to upload');

    // Read binary buffer
    const filePath = file.path || path.join(RESUME_DIRECTORY, file.filename);
    const buffer = file.buffer || await fs.readFile(filePath);

    // Compute SHA-256 content hash for duplicate detection
    const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');

    const existingResume = await Resume.findOne({ userId });

    // Deduplication check: If same content hash and parsing succeeded, reuse parsed result
    if (
      existingResume &&
      existingResume.contentHash === contentHash &&
      existingResume.parsingStatus === 'SUCCESS'
    ) {
      // Clean up newly uploaded redundant file from disk if separate
      if (file.filename && file.filename !== existingResume.storedFileName) {
        await this._deleteStoredFile(file.filename);
      }
      const latestATS = await AIAnalysis.findOne({
        studentId: userId,
        analysisType: 'ats',
      }).sort({ createdAt: -1 }).lean();

      return {
        resume: existingResume,
        isDuplicate: true,
        parsedData: existingResume.parsedData,
        atsResult: latestATS?.result || null,
      };
    }

    // Extract text using native parser (pdf-parse or mammoth)
    const extractResult = await resumeParserService.extractText(
      buffer,
      file.mimetype,
      file.originalname
    );

    let parsedData = null;
    if (extractResult.success && extractResult.rawText) {
      parsedData = resumeParserService.parseStructuredData(extractResult.rawText);
    }

    const fileUrl = `${RESUME_PUBLIC_PATH}${file.filename}`;
    const fileType = (file.originalname || '').toLowerCase().endsWith('.docx') ? 'docx' : 'pdf';
    const nextVersion = (existingResume?.version || 0) + 1;
    const now = new Date();

    let resume;
    if (existingResume) {
      if (existingResume.storedFileName !== file.filename) {
        await this._deleteStoredFile(existingResume.storedFileName);
      }
      existingResume.originalFileName = file.originalname;
      existingResume.storedFileName = file.filename;
      existingResume.fileUrl = fileUrl;
      existingResume.fileSize = file.size;
      existingResume.mimeType = file.mimetype || (fileType === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf');
      existingResume.fileType = fileType;
      existingResume.uploadedAt = now;
      existingResume.updatedAt = now;
      existingResume.status = 'UPLOADED';
      existingResume.resumeSource = 'uploaded';
      existingResume.rawText = extractResult.rawText || '';
      existingResume.parsedData = parsedData;
      existingResume.contentHash = contentHash;
      existingResume.version = nextVersion;
      existingResume.parsingStatus = extractResult.status;
      existingResume.parsingError = extractResult.error;
      existingResume.parsedAt = now;
      existingResume.generatedAt = null;
      existingResume.sourceSnapshot = null;
      existingResume.generationVersion = null;
      await existingResume.save();
      resume = existingResume;
    } else {
      resume = await Resume.create({
        userId,
        studentId: userId,
        originalFileName: file.originalname,
        storedFileName: file.filename,
        fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype || (fileType === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf'),
        fileType,
        uploadedAt: now,
        updatedAt: now,
        status: 'UPLOADED',
        resumeSource: 'uploaded',
        rawText: extractResult.rawText || '',
        parsedData,
        contentHash,
        version: nextVersion,
        parsingStatus: extractResult.status,
        parsingError: extractResult.error,
        parsedAt: now,
      });
    }

    // Auto-run ATS analysis if text extraction was successful
    let atsResult = null;
    if (extractResult.success && extractResult.rawText) {
      try {
        const studentUser = { _id: userId, role: 'student' };
        const atsResponse = await aiIntegrationService.analyzeATS(studentUser, {
          resumeText: extractResult.rawText,
          jobDescription: null,
        }, {
          resumeVersion: resume.version,
          resumeId: resume._id,
          source: 'uploaded_resume',
        });
        atsResult = atsResponse?.analysis?.result || null;
      } catch (err) {
        // ATS failure must not abort successful resume upload & parsing
        console.error('[RESUME_INGESTION] Auto-run ATS analysis failed:', err.message);
      }
    }

    return {
      resume,
      isDuplicate: false,
      parsedData: resume.parsedData,
      atsResult,
    };
  }

  /** Get student's resume by userId. */
  async getResume(userId) {
    return Resume.findOne({ userId });
  }

  /**
   * Get resume with the most recent ATS result attached.
   * Returns { resume, atsResult } where atsResult may be null.
   */
  async getLatestWithATS(userId) {
    const resume = await Resume.findOne({ userId });
    if (!resume) return { resume: null, atsResult: null };

    // Fetch the most recent ATS result
    const atsResult = await AIAnalysis.findOne({
      studentId: userId,
      analysisType: 'ats',
    }).sort({ createdAt: -1 }).lean();

    return {
      resume,
      atsResult: atsResult?.result || null,
      parsedData: resume.parsedData || null,
      parsingStatus: resume.parsingStatus || 'NOT_PARSED',
    };
  }

  /**
   * Get comprehensive comparison of resume against profile and verified portfolio.
   */
  async getComparison(userId) {
    const resume = await Resume.findOne({ userId });
    if (!resume || !resume.parsedData) {
      throw ApiError.badRequest('No parsed resume data available for comparison. Please upload a readable resume first.');
    }

    const [user, profile, github, certificates, portfolios, ownProjects] = await Promise.all([
      User.findById(userId).select('fullName email college branch graduationYear').lean(),
      Profile.findOne({ user: userId }).lean(),
      GitHubAccount.findOne({ userId }).lean(),
      Certificate.find({ userId }).lean(),
      Portfolio.find({ student: userId }).populate({ path: 'workspace', populate: { path: 'project' } }).lean(),
      Project.find({ userId, projectStatus: { $ne: 'Archived' } }).lean(),
    ]);

    const verifiedProjects = portfolios
      .filter((p) => p.workspace?.project)
      .map((p) => ({ ...p.workspace.project, verifiedByFaculty: Boolean(p.verifiedBy && p.verificationHash) }));

    const portfolioProjectIds = new Set(verifiedProjects.map((p) => String(p._id)));
    const allProjects = [...verifiedProjects, ...ownProjects.filter((p) => !portfolioProjectIds.has(String(p._id)))];

    const profileComparison = resumeParserService.compareWithProfile(resume.parsedData, user, profile);
    const portfolioComparison = resumeParserService.compareWithPortfolio(resume.parsedData, allProjects, certificates, github);

    return {
      resume: {
        id: resume._id,
        version: resume.version,
        fileName: resume.originalFileName,
        fileType: resume.fileType,
        uploadedAt: resume.uploadedAt,
      },
      profileComparison,
      portfolioComparison,
    };
  }

  /**
   * Selectively import verified/confirmed resume data into the student's profile.
   * Never silently overwrites fields unless explicitly confirmed.
   */
  async importToProfile(userId, { skills = [], education = null } = {}) {
    let profile = await Profile.findOne({ user: userId });
    if (!profile) {
      profile = await Profile.create({ user: userId, skills: [] });
    }

    let updated = false;

    // Import selected skills without duplicates
    if (Array.isArray(skills) && skills.length > 0) {
      const existingSet = new Set((profile.skills || []).map((s) => s.toLowerCase()));
      const skillsToAdd = skills.filter((s) => typeof s === 'string' && s.trim() && !existingSet.has(s.trim().toLowerCase()));

      if (skillsToAdd.length > 0) {
        profile.skills = [...(profile.skills || []), ...skillsToAdd];
        updated = true;
      }
    }

    // Import education if user explicitly confirmed and profile values were empty
    if (education && typeof education === 'object') {
      if (education.college && !profile.college) {
        profile.college = education.college;
        updated = true;
      }
      if (education.degree && !profile.degree) {
        profile.degree = education.degree;
        updated = true;
      }
      if (education.branch && !profile.branch) {
        profile.branch = education.branch;
        updated = true;
      }
    }

    if (updated) {
      await profile.save();
    }

    return {
      message: 'Profile updated successfully with selected resume items.',
      profile,
    };
  }

  /**
   * Re-analyze active resume text against an optional job description.
   */
  async reanalyzeATS(userId, { jobDescription = null } = {}) {
    const resume = await Resume.findOne({ userId });
    if (!resume) throw ApiError.notFound('No active resume found. Please upload a resume first.');
    if (!resume.rawText) throw ApiError.badRequest('The active resume has no readable text content for ATS analysis.');

    const studentUser = { _id: userId, role: 'student' };
    const atsResponse = await aiIntegrationService.analyzeATS(studentUser, {
      resumeText: resume.rawText,
      jobDescription: jobDescription || null,
    }, {
      resumeVersion: resume.version,
      resumeId: resume._id,
      source: 'uploaded_resume_reanalysis',
    });

    return {
      resumeVersion: resume.version,
      atsResult: atsResponse?.analysis?.result || null,
    };
  }

  /** Delete student's resume. */
  async deleteResume(userId) {
    const resume = await Resume.findOne({ userId });
    if (!resume) throw ApiError.notFound('No resume found to delete');
    await this._deleteStoredFile(resume.storedFileName);
    await Resume.deleteOne({ _id: resume._id });
    return { message: 'Resume deleted successfully' };
  }

  /**
   * Generate a new ATS-safe PDF from the student's real profile data.
   * Replaces any existing resume file on disk and in the database.
   * Automatically triggers ATS analysis after generation.
   *
   * @param {string} userId
   * @param {{ jobDescription?: string, sections?: object }} options
   */
  async generateResume(userId, { jobDescription = null, sections = {} } = {}) {
    // ── 1. Gather all real source data ──────────────────────────────────────
    const [user, profile, github] = await Promise.all([
      User.findById(userId).select('fullName email college branch graduationYear').lean(),
      Profile.findOne({ user: userId }).lean(),
      GitHubAccount.findOne({ userId }).lean(),
    ]);

    if (!user) throw ApiError.notFound('Student not found');

    // Verified certificates only
    const certificates = await Certificate.find({
      userId,
      verificationStatus: 'Verified',
    }).lean();

    // Projects associated with the student via their workspaces/portfolios
    // Using Portfolio → Workspace → Project chain (faculty-verified first)
    const portfolios = await Portfolio.find({ student: userId })
      .populate({ path: 'workspace', populate: { path: 'project' } })
      .lean();

    const verifiedProjects = portfolios
      .filter((p) => p.workspace?.project)
      .map((p) => ({
        ...p.workspace.project,
        verifiedByFaculty: Boolean(p.verifiedBy && p.verificationHash),
      }));

    // Also include student-owned projects not yet in a portfolio
    const ownProjects = await Project.find({ userId, projectStatus: { $ne: 'Archived' } }).lean();
    const portfolioProjectIds = new Set(verifiedProjects.map((p) => String(p._id)));
    const unverifiedProjects = ownProjects
      .filter((p) => !portfolioProjectIds.has(String(p._id)))
      .map((p) => ({ ...p, verifiedByFaculty: false }));

    // Verified first, then unverified, capped to avoid huge PDFs
    const projects = [...verifiedProjects, ...unverifiedProjects].slice(0, 10);

    // ── 2. Compute source snapshot ───────────────────────────────────────────
    const snapshot = computeSourceSnapshot(user, profile, certificates, projects, github);

    // ── 3. Assemble resume text ──────────────────────────────────────────────
    const resumeText = buildResumeText({ user, profile, certificates, projects, github, sections });
    if (!resumeText.trim()) {
      throw ApiError.badRequest('Insufficient profile data to generate a resume. Complete your profile first.');
    }

    // ── 4. Generate PDF ──────────────────────────────────────────────────────
    const pdfBuffer = await generatePDF({ user, profile, certificates, projects, github, sections });

    // ── 5. Save PDF to disk ──────────────────────────────────────────────────
    const fileName = `resume-gen-${userId}-${Date.now()}.pdf`;
    const filePath = path.join(RESUME_DIRECTORY, fileName);
    await fs.writeFile(filePath, pdfBuffer);

    const fileUrl = `${RESUME_PUBLIC_PATH}${fileName}`;
    const now = new Date();

    // ── 6. Update / create Resume document ──────────────────────────────────
    let resume = await Resume.findOne({ userId });
    if (resume) {
      await this._deleteStoredFile(resume.storedFileName);
      resume.originalFileName   = `${(user.fullName || 'resume').replace(/\s+/g, '_')}_resume.pdf`;
      resume.storedFileName     = fileName;
      resume.fileUrl            = fileUrl;
      resume.fileSize           = pdfBuffer.length;
      resume.mimeType           = 'application/pdf';
      resume.uploadedAt         = now;
      resume.updatedAt          = now;
      resume.status             = 'GENERATED';
      resume.resumeSource       = 'generated';
      resume.generatedAt        = now;
      resume.sourceSnapshot     = snapshot;
      resume.generationVersion  = GENERATION_VERSION;
      await resume.save();
    } else {
      resume = await Resume.create({
        userId,
        originalFileName:   `${(user.fullName || 'resume').replace(/\s+/g, '_')}_resume.pdf`,
        storedFileName:     fileName,
        fileUrl,
        fileSize:           pdfBuffer.length,
        mimeType:           'application/pdf',
        uploadedAt:         now,
        updatedAt:          now,
        status:             'GENERATED',
        resumeSource:       'generated',
        generatedAt:        now,
        sourceSnapshot:     snapshot,
        generationVersion:  GENERATION_VERSION,
      });
    }

    // ── 7. Run ATS analysis automatically (non-blocking on failure) ──────────
    let atsResult = null;
    try {
      const studentUser = { _id: userId, role: 'student' };
      const atsResponse = await aiIntegrationService.analyzeATS(studentUser, { jobDescription });
      atsResult = atsResponse?.analysis?.result || null;
    } catch {
      // ATS failure must never block resume generation
    }

    return { resume, atsResult };
  }

  /**
   * Check whether the student's generated resume is stale.
   * Recomputes the source snapshot and compares to the stored one.
   * Updates the resume.status to STALE if data has changed.
   */
  async checkAndMarkStale(userId) {
    const resume = await Resume.findOne({ userId });
    if (!resume || resume.resumeSource !== 'generated' || !resume.sourceSnapshot) {
      return { isStale: false, resume };
    }

    const [user, profile, github] = await Promise.all([
      User.findById(userId).select('fullName email college branch graduationYear').lean(),
      Profile.findOne({ user: userId }).lean(),
      GitHubAccount.findOne({ userId }).lean(),
    ]);

    if (!user) return { isStale: false, resume };

    const certificates = await Certificate.find({ userId, verificationStatus: 'Verified' }).lean();
    const portfolios   = await Portfolio.find({ student: userId })
      .populate({ path: 'workspace', populate: { path: 'project' } }).lean();
    const verifiedProjects = portfolios
      .filter((p) => p.workspace?.project)
      .map((p) => ({ ...p.workspace.project, verifiedByFaculty: true }));
    const ownProjects = await Project.find({ userId, projectStatus: { $ne: 'Archived' } }).lean();
    const portfolioProjectIds = new Set(verifiedProjects.map((p) => String(p._id)));
    const unverifiedProjects = ownProjects.filter((p) => !portfolioProjectIds.has(String(p._id)));
    const projects = [...verifiedProjects, ...unverifiedProjects].slice(0, 10);

    const currentSnapshot = computeSourceSnapshot(user, profile, certificates, projects, github);
    const isStale = currentSnapshot !== resume.sourceSnapshot;

    if (isStale && resume.status !== 'STALE') {
      resume.status = 'STALE';
      await resume.save();
    }

    return { isStale, resume };
  }

  /**
   * Check whether the student's active ATS analysis is stale relative to the active resume.
   * Compares resume.version to latest ATS analysis inputSnapshot.resumeVersion.
   */
  async checkStale(userId) {
    const resume = await Resume.findOne({ userId });
    if (!resume) return { stale: false, reason: 'No resume uploaded' };

    const latestATS = await AIAnalysis.findOne({
      studentId: userId,
      analysisType: 'ats',
    }).sort({ createdAt: -1 }).lean();

    if (!latestATS) {
      return { stale: true, reason: 'No ATS analysis found for this resume' };
    }

    const atsResumeVersion = latestATS.inputSnapshot?.resumeVersion;
    if (atsResumeVersion && resume.version && resume.version > atsResumeVersion) {
      return {
        stale: true,
        reason: `Resume has been updated to version ${resume.version}, which is a newer version than analyzed ATS version ${atsResumeVersion}.`,
      };
    }

    return { stale: false, reason: 'ATS analysis is up to date with active resume version.' };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  async _deleteStoredFile(storedFileName) {
    if (!storedFileName) return;
    const filePath = path.join(RESUME_DIRECTORY, storedFileName);
    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore missing file
    }
  }
}

export default new ResumeService();
