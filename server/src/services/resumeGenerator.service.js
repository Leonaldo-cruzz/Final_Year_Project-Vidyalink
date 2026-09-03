import Certificate from '../models/certificate.model.js';
import Profile from '../models/profile.model.js';
import Project from '../models/project.model.js';
import ResumeDocument from '../models/resumeDocument.model.js';
import User from '../models/user.model.js';
import atsIntegrationService from './atsIntegration.service.js';
import ApiError from '../utils/ApiError.js';
import { createResumePdf } from '../utils/resumePdf.util.js';

const sectionLabels = {
  summary: 'Professional Summary', skills: 'Technical Skills', education: 'Education', experience: 'Experience',
  projects: 'Projects', certifications: 'Certifications', achievements: 'Achievements', links: 'Links',
};
const displayDate = (value) => value ? new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(new Date(value)) : null;
const unique = (items) => [...new Set(items.filter(Boolean).map((item) => String(item).trim()).filter(Boolean))];
const latestDate = (items) => items.reduce((latest, item) => (!latest || new Date(item.updatedAt) > latest ? item.updatedAt : latest), null);

class ResumeGeneratorService {
  async getVerifiedSources(userId, projectIds = [], certificateIds = []) {
    const uniqueProjectIds = unique(projectIds);
    const uniqueCertificateIds = unique(certificateIds);
    const [projects, certificates] = await Promise.all([
      uniqueProjectIds.length ? Project.find({ _id: { $in: uniqueProjectIds }, userId, verificationStatus: 'Verified' }) : [],
      uniqueCertificateIds.length ? Certificate.find({ _id: { $in: uniqueCertificateIds }, userId, verificationStatus: 'Verified' }) : [],
    ]);
    if (projects.length !== uniqueProjectIds.length || certificates.length !== uniqueCertificateIds.length) {
      throw ApiError.badRequest('Every selected project and certificate must be owned by you and verified');
    }
    return { projects, certificates };
  }

  buildContent({ user, profile, projects, certificates, input }) {
    const contact = unique([user.email, profile.phone, profile.location]);
    const links = [
      profile.linkedin && { title: 'LinkedIn', meta: profile.linkedin },
      profile.github && { title: 'GitHub', meta: profile.github },
      profile.portfolio && { title: 'Portfolio', meta: profile.portfolio },
      profile.githubUsername && !profile.github && { title: 'GitHub', meta: `https://github.com/${profile.githubUsername}` },
    ].filter(Boolean);
    const targetSkills = unique([...input.requiredSkills, ...input.preferredSkills]);
    const allSkills = unique([...targetSkills, ...profile.skills, ...projects.flatMap((project) => project.technologies), ...certificates.flatMap((certificate) => certificate.skills)]);
    const sections = {};
    const requested = new Set(input.selectedSections);
    const add = (key, items) => { if (requested.has(key) && items?.length) sections[sectionLabels[key]] = { items }; };

    add('summary', unique([profile.headline, profile.bio, `Targeting ${input.targetRole} opportunities.`]));
    add('skills', allSkills.length ? [allSkills.join(', ')] : []);
    const educationMeta = unique([profile.degree, profile.branch, profile.college]).join(' - ');
    add('education', educationMeta ? [{
      title: educationMeta,
      meta: unique([profile.graduationYear && `Expected ${profile.graduationYear}`, profile.cgpa !== null && profile.cgpa !== undefined && `CGPA: ${profile.cgpa}`]).join(' | '),
      bullets: [],
    }] : []);
    // The current profile schema has no experience or achievement source. Empty sections are intentionally omitted.
    add('experience', []);
    add('achievements', []);
    const orderedProjects = [...projects].sort((left, right) => {
      const score = (project) => project.technologies.filter((technology) => targetSkills.some((skill) => skill.toLowerCase() === technology.toLowerCase())).length;
      return score(right) - score(left);
    });
    add('projects', orderedProjects.map((project) => ({
      title: project.title,
      meta: unique([project.category, project.projectStatus]).join(' | '),
      bullets: unique([project.shortDescription, project.technologies.length ? `Technologies: ${project.technologies.join(', ')}` : null, project.githubRepository && `Repository: ${project.githubRepository}`, project.liveDeployment && `Live project: ${project.liveDeployment}`]),
    })));
    add('certifications', certificates.map((certificate) => ({
      title: certificate.title,
      meta: unique([certificate.issuer, displayDate(certificate.issueDate)]).join(' | '),
      bullets: unique([certificate.credentialId && `Credential ID: ${certificate.credentialId}`, certificate.credentialUrl && `Credential: ${certificate.credentialUrl}`]),
    })));
    add('links', links);
    return { header: { name: profile.fullName || user.fullName, contact }, sections };
  }

  async generate(user, input) {
    const profile = await Profile.findOne({ user: user._id });
    if (!profile) throw ApiError.badRequest('Create your profile before generating a resume');
    const { projects, certificates } = await this.getVerifiedSources(user._id, input.selectedProjectIds, input.selectedCertificateIds);
    const content = this.buildContent({ user, profile, projects, certificates, input });
    const lastVersion = await ResumeDocument.findOne({ userId: user._id }).sort({ version: -1 }).select('version');
    const atsAnalysis = await atsIntegrationService.analyze(content, {
      jobTitle: input.targetRole,
      company: input.targetCompany || null,
      jobDescription: input.jobDescription || null,
      requiredSkills: input.requiredSkills,
      preferredSkills: input.preferredSkills,
    });
    const document = await ResumeDocument.create({
      userId: user._id,
      targetRole: input.targetRole,
      targetCompany: input.targetCompany || null,
      jobDescription: input.jobDescription || null,
      requiredSkills: unique(input.requiredSkills),
      preferredSkills: unique(input.preferredSkills),
      selectedSections: input.selectedSections,
      sourceRefs: { projects: projects.map((item) => item._id), certificates: certificates.map((item) => item._id) },
      content,
      atsAnalysis,
      version: (lastVersion?.version || 0) + 1,
      sourceProfileVersion: latestDate([profile, user]),
      sourcePortfolioVersion: latestDate([...projects, ...certificates]),
      sourceEvaluationVersion: null,
    });
    return document;
  }

  async refreshStaleStatus(document) {
    const [profile, user, projects, certificates] = await Promise.all([
      Profile.findOne({ user: document.userId }).select('updatedAt'),
      User.findById(document.userId).select('updatedAt'),
      document.sourceRefs.projects.length ? Project.find({ _id: { $in: document.sourceRefs.projects } }).select('updatedAt') : [],
      document.sourceRefs.certificates.length ? Certificate.find({ _id: { $in: document.sourceRefs.certificates } }).select('updatedAt') : [],
    ]);
    const currentPortfolioVersion = latestDate([...projects, ...certificates]);
    const currentProfileVersion = latestDate([profile, user].filter(Boolean));
    const stale = (currentProfileVersion && new Date(currentProfileVersion) > new Date(document.sourceProfileVersion || 0))
      || (currentPortfolioVersion && new Date(currentPortfolioVersion) > new Date(document.sourcePortfolioVersion || 0));
    if (stale && document.status !== 'STALE') {
      document.status = 'STALE';
      await document.save();
    }
    return document;
  }

  async list(userId) {
    const documents = await ResumeDocument.find({ userId }).sort({ version: -1 });
    return Promise.all(documents.map((document) => this.refreshStaleStatus(document)));
  }

  async get(userId, id) {
    const document = await ResumeDocument.findOne({ _id: id, userId });
    if (!document) throw ApiError.notFound('Generated resume not found');
    return this.refreshStaleStatus(document);
  }

  async update(userId, id, input) {
    const document = await this.get(userId, id);
    const sourceInput = {
      selectedProjectIds: input.selectedProjectIds ?? document.sourceRefs.projects.map(String),
      selectedCertificateIds: input.selectedCertificateIds ?? document.sourceRefs.certificates.map(String),
    };
    await this.getVerifiedSources(userId, sourceInput.selectedProjectIds, sourceInput.selectedCertificateIds);
    Object.assign(document, {
      ...(input.targetRole !== undefined && { targetRole: input.targetRole }),
      ...(input.targetCompany !== undefined && { targetCompany: input.targetCompany || null }),
      ...(input.jobDescription !== undefined && { jobDescription: input.jobDescription || null }),
      ...(input.requiredSkills !== undefined && { requiredSkills: unique(input.requiredSkills) }),
      ...(input.preferredSkills !== undefined && { preferredSkills: unique(input.preferredSkills) }),
      ...(input.selectedSections !== undefined && { selectedSections: input.selectedSections }),
      sourceRefs: { projects: sourceInput.selectedProjectIds, certificates: sourceInput.selectedCertificateIds },
      status: 'STALE',
    });
    await document.save();
    return document;
  }

  async remove(userId, id) {
    const document = await ResumeDocument.findOneAndDelete({ _id: id, userId });
    if (!document) throw ApiError.notFound('Generated resume not found');
  }

  async regenerate(user, id) {
    const document = await this.get(user._id, id);
    return this.generate(user, {
      targetRole: document.targetRole,
      targetCompany: document.targetCompany,
      jobDescription: document.jobDescription,
      requiredSkills: document.requiredSkills,
      preferredSkills: document.preferredSkills,
      selectedSections: document.selectedSections,
      selectedProjectIds: document.sourceRefs.projects.map(String),
      selectedCertificateIds: document.sourceRefs.certificates.map(String),
    });
  }

  async download(userId, id) {
    const document = await this.get(userId, id);
    return { document, pdf: createResumePdf(document.content) };
  }
}

export default new ResumeGeneratorService();
