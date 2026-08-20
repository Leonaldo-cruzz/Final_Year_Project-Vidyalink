import crypto from 'crypto';
import Portfolio, { generateCertificateId } from '../models/portfolio.model.js';
import Workspace from '../models/workspace.model.js';
import Milestone from '../models/milestone.model.js';
import ApiError from '../utils/ApiError.js';

class PortfolioService {
  async generatePortfolioForWorkspace(workspaceId) {
    const existing = await Portfolio.findOne({ workspace: workspaceId })
      .populate('student', 'fullName email avatar college branch')
      .populate('verifiedBy', 'fullName email avatar college');

    if (existing) return existing;

    const workspace = await Workspace.findById(workspaceId)
      .populate('project')
      .populate('student')
      .populate('owner');

    if (!workspace) {
      throw ApiError.notFound('Workspace not found');
    }

    const milestones = await Milestone.find({ workspace: workspaceId });
    const verifiedMilestones = milestones
      .filter((m) => m.status === 'verified')
      .map((m) => ({ title: m.title, completedAt: m.verifiedAt || m.updatedAt }));

    const certificateId = generateCertificateId();
    const rawData = `${certificateId}:${workspace.student._id}:${workspace.project._id}:${Date.now()}`;
    const verificationHash = crypto.createHash('sha256').update(rawData).digest('hex');

    return Portfolio.create({
      certificateId,
      student: workspace.student._id,
      workspace: workspace._id,
      projectTitle: workspace.project.title,
      verifiedBy: workspace.owner._id,
      skillsVerified: workspace.project.techStack || [],
      milestonesSummary: verifiedMilestones,
      verificationHash,
    });
  }

  async getStudentPortfolios(studentId) {
    return Portfolio.find({ student: studentId })
      .populate('student', 'fullName email avatar college branch graduationYear')
      .populate('verifiedBy', 'fullName email avatar college role')
      .populate('workspace')
      .sort({ createdAt: -1 });
  }

  async verifyCertificate(certificateId) {
    const portfolio = await Portfolio.findOne({ certificateId })
      // This is a public endpoint. Do not disclose email addresses or other
      // account-only fields in a portfolio verification response.
      .populate('student', 'fullName avatar college branch graduationYear')
      .populate('verifiedBy', 'fullName avatar college role')
      .populate({
        path: 'workspace',
        populate: { path: 'project' },
      });

    if (!portfolio) {
      throw ApiError.notFound('Certificate or Portfolio not found or invalid');
    }

    return portfolio;
  }
}

export default new PortfolioService();
