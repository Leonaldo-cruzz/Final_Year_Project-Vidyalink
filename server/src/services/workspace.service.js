import Workspace from '../models/workspace.model.js';
import Milestone from '../models/milestone.model.js';
import ApiError from '../utils/ApiError.js';

class WorkspaceService {
  async getUserWorkspaces(userId, role) {
    const query = role === 'student' ? { student: userId } : { owner: userId };
    return Workspace.find(query)
      .populate('project', 'title description techStack projectId')
      .populate('student', 'fullName email avatar college branch')
      .populate('owner', 'fullName email avatar college')
      .sort({ updatedAt: -1 });
  }

  async getWorkspaceById(userId, workspaceId) {
    const workspace = await Workspace.findById(workspaceId)
      .populate('project')
      .populate('student', 'fullName email avatar college branch graduationYear')
      .populate('owner', 'fullName email avatar college');

    if (!workspace) {
      throw ApiError.notFound('Workspace not found');
    }

    const isStudent = workspace.student._id.toString() === userId.toString();
    const isOwner = workspace.owner._id.toString() === userId.toString();

    if (!isStudent && !isOwner) {
      throw ApiError.forbidden('You do not have access to this workspace');
    }

    return workspace;
  }

  async updateWorkspaceProgress(workspaceId) {
    const milestones = await Milestone.find({ workspace: workspaceId });
    if (milestones.length === 0) return 0;

    const verifiedCount = milestones.filter((m) => m.status === 'verified').length;
    const progressPercentage = Math.round((verifiedCount / milestones.length) * 100);

    const updateData = { progressPercentage };
    if (progressPercentage === 100) {
      updateData.status = 'completed';
      updateData.completedAt = new Date();
    }

    await Workspace.findByIdAndUpdate(workspaceId, updateData);
    return progressPercentage;
  }
}

export default new WorkspaceService();
