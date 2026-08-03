import Project, { generateProjectId } from '../models/project.model.js';
import Application from '../models/application.model.js';
import ApiError from '../utils/ApiError.js';

class ProjectService {
  async createProject(userId, projectData) {
    const projectId = await generateProjectId();
    return Project.create({
      createdBy: userId,
      user: userId,
      projectId,
      ...projectData,
    });
  }

  async getProjects(filters = {}) {
    const query = {};

    if (filters.status) {
      query.status = filters.status;
    } else {
      query.status = { $ne: 'closed' };
    }

    if (filters.domain && filters.domain !== 'all') {
      query.domain = new RegExp(`^${filters.domain}$`, 'i');
    }

    if (filters.difficulty && filters.difficulty !== 'all') {
      query.difficulty = filters.difficulty;
    }

    if (filters.mode && filters.mode !== 'all') {
      query.mode = filters.mode;
    }

    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { company: searchRegex },
        { domain: searchRegex },
        { requiredSkills: { $in: [searchRegex] } },
      ];
    }

    const projects = await Project.find(query)
      .populate('createdBy', 'fullName email avatar college')
      .populate('selectedStudent', 'fullName email avatar')
      .sort({ createdAt: -1 });

    // Aggregate applicants count for each project
    const projectIds = projects.map((p) => p._id);
    const applicationCounts = await Application.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$project', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    applicationCounts.forEach((item) => {
      countMap[item._id.toString()] = item.count;
    });

    return projects.map((project) => {
      const plainObj = project.toObject();
      plainObj.applicantsCount = countMap[project._id.toString()] || 0;
      return plainObj;
    });
  }

  async getMyProjects(userId) {
    const projects = await Project.find({
      $or: [{ createdBy: userId }, { user: userId }],
    })
      .populate('selectedStudent', 'fullName email avatar')
      .sort({ createdAt: -1 });

    const projectIds = projects.map((p) => p._id);
    const applicationCounts = await Application.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$project', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    applicationCounts.forEach((item) => {
      countMap[item._id.toString()] = item.count;
    });

    return projects.map((project) => {
      const plainObj = project.toObject();
      plainObj.applicantsCount = countMap[project._id.toString()] || 0;
      return plainObj;
    });
  }

  async getProjectById(id) {
    const project = await Project.findById(id)
      .populate('createdBy', 'fullName email avatar college')
      .populate('selectedStudent', 'fullName email avatar');

    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    const applicantsCount = await Application.countDocuments({ project: id });
    const plainObj = project.toObject();
    plainObj.applicantsCount = applicantsCount;
    return plainObj;
  }

  async updateProject(userId, id, projectData, userRole) {
    const project = await Project.findById(id);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    const isOwner = project.createdBy?.toString() === userId.toString() || project.user?.toString() === userId.toString();
    if (!isOwner && userRole !== 'admin') {
      throw ApiError.forbidden('Only the project owner can update this project');
    }

    Object.assign(project, projectData);
    await project.save();
    return project;
  }

  async deleteProject(userId, id, userRole) {
    const project = await Project.findById(id);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    const isOwner = project.createdBy?.toString() === userId.toString() || project.user?.toString() === userId.toString();
    if (!isOwner && userRole !== 'admin') {
      throw ApiError.forbidden('Only the project owner can delete this project');
    }

    await Project.findByIdAndDelete(id);
  }
}

export default new ProjectService();
