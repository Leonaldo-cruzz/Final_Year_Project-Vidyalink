import ProjectEngagement from '../models/projectEngagement.model.js';
import Project from '../models/project.model.js';
import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';

const ENGAGEMENT_POPULATION = [
  { path: 'projectOpportunityId', select: 'projectId title company status selectedStudent' },
  { path: 'studentId', select: 'fullName email avatar college branch graduationYear' },
  { path: 'recruiterId', select: 'fullName email avatar company' },
  { path: 'facultyId', select: 'fullName email avatar college branch' },
];

const areIdsEqual = (firstId, secondId) => (
  firstId?.toString() === secondId?.toString()
);

class ProjectEngagementService {
  async createEngagement(recruiterId, engagementData) {
    const project = await Project.findById(engagementData.projectOpportunityId);
    if (!project) {
      throw ApiError.notFound('Project opportunity not found');
    }

    const isProjectOwner = areIdsEqual(project.createdBy, recruiterId)
      || areIdsEqual(project.user, recruiterId);
    if (!isProjectOwner) {
      throw ApiError.forbidden('Only the project recruiter can create an engagement');
    }

    if (!project.selectedStudent) {
      throw ApiError.badRequest('Select a student before creating an engagement');
    }

    if (!areIdsEqual(project.selectedStudent, engagementData.studentId)) {
      throw ApiError.badRequest('The engagement student must be the selected student for this project');
    }

    const student = await User.findOne({
      _id: engagementData.studentId,
      role: 'student',
      status: 'active',
    });
    if (!student) {
      throw ApiError.badRequest('The selected student is not available for engagement');
    }

    if (engagementData.facultyId) {
      const faculty = await User.findOne({
        _id: engagementData.facultyId,
        role: 'faculty',
        status: 'active',
      });
      if (!faculty) {
        throw ApiError.badRequest('Faculty member is not available for engagement');
      }
    }

    const existingEngagement = await ProjectEngagement.exists({
      projectOpportunityId: project._id,
    });
    if (existingEngagement) {
      throw ApiError.conflict('An engagement already exists for this project');
    }

    const engagement = await ProjectEngagement.create({
      ...engagementData,
      projectOpportunityId: project._id,
      recruiterId,
    });

    return this.populateEngagement(engagement);
  }

  async getEngagementById(userId, userRole, engagementId) {
    const engagement = await ProjectEngagement.findById(engagementId);
    if (!engagement) {
      throw ApiError.notFound('Project engagement not found');
    }

    this.assertCanAccess(engagement, userId, userRole);
    return this.populateEngagement(engagement);
  }

  async updateEngagement(userId, userRole, engagementId, updates) {
    const engagement = await ProjectEngagement.findById(engagementId);
    if (!engagement) {
      throw ApiError.notFound('Project engagement not found');
    }

    this.assertCanManage(engagement, userId, userRole);

    const startDate = updates.startDate || engagement.startDate;
    if (updates.expectedEndDate && startDate && updates.expectedEndDate < startDate) {
      throw ApiError.badRequest('Expected end date must be on or after the start date');
    }

    Object.assign(engagement, updates);
    if (updates.status === 'Completed' && !engagement.completedDate) {
      engagement.completedDate = new Date();
    }

    await engagement.save();
    return this.populateEngagement(engagement);
  }

  async getStudentEngagements(studentId) {
    const engagements = await ProjectEngagement.find({ studentId })
      .populate(ENGAGEMENT_POPULATION)
      .sort({ updatedAt: -1 });
    return engagements;
  }

  async getRecruiterEngagements(recruiterId) {
    const engagements = await ProjectEngagement.find({ recruiterId })
      .populate(ENGAGEMENT_POPULATION)
      .sort({ updatedAt: -1 });
    return engagements;
  }

  async getFacultyEngagements(facultyId) {
    const engagements = await ProjectEngagement.find({ facultyId })
      .populate(ENGAGEMENT_POPULATION)
      .sort({ updatedAt: -1 });
    return engagements;
  }

  async populateEngagement(engagement) {
    return engagement.populate(ENGAGEMENT_POPULATION);
  }

  assertCanAccess(engagement, userId, userRole) {
    const isParticipant = areIdsEqual(engagement.studentId, userId)
      || areIdsEqual(engagement.recruiterId, userId)
      || areIdsEqual(engagement.facultyId, userId);

    if (!isParticipant && userRole !== 'admin') {
      throw ApiError.forbidden('You do not have access to this project engagement');
    }
  }

  assertCanManage(engagement, userId, userRole) {
    const isRecruiter = userRole === 'recruiter'
      && areIdsEqual(engagement.recruiterId, userId);
    const isFaculty = userRole === 'faculty'
      && areIdsEqual(engagement.facultyId, userId);

    if (!isRecruiter && !isFaculty) {
      throw ApiError.forbidden('Only the assigned recruiter or faculty member can update this engagement');
    }
  }
}

export default new ProjectEngagementService();
