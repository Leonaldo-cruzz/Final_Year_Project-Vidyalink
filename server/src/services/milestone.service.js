import Milestone from '../models/milestone.model.js';
import Workspace from '../models/workspace.model.js';
import workspaceService from './workspace.service.js';
import portfolioService from './portfolio.service.js';
import notificationService from './notification.service.js';
import ApiError from '../utils/ApiError.js';

class MilestoneService {
  async createMilestone(userId, { workspaceId, title, description, dueDate, order }) {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw ApiError.notFound('Workspace not found');
    }

    if (workspace.owner.toString() !== userId.toString()) {
      throw ApiError.forbidden('Only workspace owner can add milestones');
    }

    const milestoneCount = await Milestone.countDocuments({ workspace: workspaceId });

    const milestone = await Milestone.create({
      workspace: workspaceId,
      title,
      description,
      dueDate,
      order: order || milestoneCount + 1,
      status: 'pending',
    });

    await workspaceService.updateWorkspaceProgress(workspaceId);
    return milestone;
  }

  async getWorkspaceMilestones(userId, workspaceId) {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw ApiError.notFound('Workspace not found');
    }

    const isStudent = workspace.student.toString() === userId.toString();
    const isOwner = workspace.owner.toString() === userId.toString();

    if (!isStudent && !isOwner) {
      throw ApiError.forbidden('Access denied');
    }

    return Milestone.find({ workspace: workspaceId }).sort({ order: 1, dueDate: 1 });
  }

  async updateMilestone(userId, milestoneId, updateData) {
    const milestone = await Milestone.findById(milestoneId).populate('workspace');
    if (!milestone) {
      throw ApiError.notFound('Milestone not found');
    }

    if (milestone.workspace.owner.toString() !== userId.toString()) {
      throw ApiError.forbidden('Only workspace owner can modify milestone details');
    }

    Object.assign(milestone, updateData);
    await milestone.save();
    return milestone;
  }

  async deleteMilestone(userId, milestoneId) {
    const milestone = await Milestone.findById(milestoneId).populate('workspace');
    if (!milestone) {
      throw ApiError.notFound('Milestone not found');
    }

    if (milestone.workspace.owner.toString() !== userId.toString()) {
      throw ApiError.forbidden('Only workspace owner can delete milestones');
    }

    const workspaceId = milestone.workspace._id;
    await Milestone.findByIdAndDelete(milestoneId);
    await workspaceService.updateWorkspaceProgress(workspaceId);
  }

  async submitDeliverable(userId, milestoneId, { deliverableUrl, deliverableNotes }) {
    const milestone = await Milestone.findById(milestoneId).populate('workspace');
    if (!milestone) {
      throw ApiError.notFound('Milestone not found');
    }

    if (milestone.workspace.student.toString() !== userId.toString()) {
      throw ApiError.forbidden('Only assigned student can submit deliverables');
    }

    milestone.deliverableUrl = deliverableUrl;
    if (deliverableNotes) milestone.deliverableNotes = deliverableNotes;
    milestone.status = 'submitted';
    milestone.submittedAt = new Date();
    await milestone.save();

    // Trigger notification to workspace owner
    await notificationService.createNotification({
      recipient: milestone.workspace.owner,
      sender: userId,
      type: 'verification',
      title: 'New Deliverable Submitted',
      message: `Deliverable evidence submitted for "${milestone.title}".`,
      link: `/workspace/${milestone.workspace._id}`,
      metadata: { milestoneId: milestone._id, workspaceId: milestone.workspace._id },
    });

    return milestone;
  }

  async getPendingVerifications(userId, userRole) {
    const query = { status: 'submitted' };
    const milestones = await Milestone.find(query)
      .populate({
        path: 'workspace',
        populate: [
          { path: 'project', select: 'title technologies domain category' },
          { path: 'student', select: 'fullName email college branch graduationYear avatar' },
          { path: 'owner', select: 'fullName email college role' },
        ],
      })
      .sort({ submittedAt: -1 });

    return milestones.filter((m) => {
      if (userRole === 'faculty' || userRole === 'admin') return true;
      return m.workspace?.owner?._id?.toString() === userId.toString();
    });
  }

  async verifyMilestone(userId, milestoneId, { status, verificationStatus, feedback }, userRole) {
    const milestone = await Milestone.findById(milestoneId).populate('workspace');
    if (!milestone) {
      throw ApiError.notFound('Milestone not found');
    }

    const isAuthorized =
      userRole === 'faculty' ||
      userRole === 'admin' ||
      milestone.workspace.owner.toString() === userId.toString();

    if (!isAuthorized) {
      throw ApiError.forbidden('Only workspace owner or faculty can verify deliverables');
    }

    const targetStatus = status || verificationStatus;
    if (!['verified', 'rejected'].includes(targetStatus)) {
      throw ApiError.badRequest('Verification status must be verified or rejected');
    }

    milestone.status = targetStatus;
    if (feedback) milestone.feedback = feedback;
    if (targetStatus === 'verified') {
      milestone.verifiedAt = new Date();
    }
    await milestone.save();

    const progress = await workspaceService.updateWorkspaceProgress(milestone.workspace._id);

    // Auto generate Verified Portfolio when workspace hits 100% completion
    let portfolio = null;
    if (progress === 100) {
      portfolio = await portfolioService.generatePortfolioForWorkspace(milestone.workspace._id);
    }

    // Trigger notification to student
    const isVerified = targetStatus === 'verified';
    await notificationService.createNotification({
      recipient: milestone.workspace.student,
      sender: userId,
      type: 'verification',
      title: isVerified ? 'Milestone Evidence Verified!' : 'Milestone Review Update',
      message: isVerified
        ? `Your deliverable for "${milestone.title}" has been verified.`
        : `Faculty feedback for "${milestone.title}": ${feedback || 'Changes requested.'}`,
      link: `/workspace/${milestone.workspace._id}`,
      metadata: { milestoneId: milestone._id, workspaceId: milestone.workspace._id },
    });

    return { milestone, progress, portfolio };
  }
}

export default new MilestoneService();

