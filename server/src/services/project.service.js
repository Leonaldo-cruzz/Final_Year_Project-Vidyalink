import fs from 'node:fs/promises';
import path from 'node:path';
import Project from '../models/project.model.js';
import verificationService, { normalizeVerificationStatus } from './verification.service.js';
import ApiError from '../utils/ApiError.js';
import {
  PROJECT_SCREENSHOT_DIRECTORY,
  PROJECT_SCREENSHOT_PUBLIC_PATH,
} from '../middleware/projectScreenshotUpload.middleware.js';

const PROJECT_FIELDS = [
  'title',
  'shortDescription',
  'detailedDescription',
  'category',
  'domain',
  'technologies',
  'githubRepository',
  'liveDeployment',
  'demoVideo',
  'documentationUrl',
  'teamMembers',
  'startDate',
  'endDate',
  'projectStatus',
  'featured',
];

const pickProjectFields = (data) => Object.fromEntries(
  PROJECT_FIELDS
    .filter((field) => data[field] !== undefined)
    .map((field) => [field, data[field]])
);

const getUploadedScreenshotUrls = (files = []) => files.map(
  (file) => `${PROJECT_SCREENSHOT_PUBLIC_PATH}${file.filename}`
);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const removeStoredScreenshots = async (screenshotUrls) => {
  await Promise.all(screenshotUrls.map(async (screenshotUrl) => {
    if (!screenshotUrl.startsWith(PROJECT_SCREENSHOT_PUBLIC_PATH)) return;

    const fileName = path.basename(screenshotUrl);
    const filePath = path.join(PROJECT_SCREENSHOT_DIRECTORY, fileName);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }));
};

class ProjectService {
  async createProject(userId, projectData, files = []) {
    const data = pickProjectFields(projectData);
    const project = await Project.create({
      userId,
      ...data,
      screenshots: getUploadedScreenshotUrls(files),
    });

    return verificationService.attachToTarget(userId, 'PROJECT', project);
  }

  async getProjects(userId, { filter, search, sort } = {}) {
    const query = { userId };

    const verificationStatus = normalizeVerificationStatus(filter);
    if (verificationStatus) {
      query._id = {
        $in: await verificationService.getTargetIdsByStatus(userId, 'PROJECT', verificationStatus),
      };
    } else if (filter === 'Completed' || filter === 'In Progress') {
      query.projectStatus = filter;
    } else if (filter === 'Featured') {
      query.featured = true;
    }

    if (search?.trim()) {
      const searchRegex = new RegExp(escapeRegExp(search.trim()), 'i');
      query.$or = [
        { title: searchRegex },
        { shortDescription: searchRegex },
        { detailedDescription: searchRegex },
        { domain: searchRegex },
        { technologies: searchRegex },
      ];
    }

    const sortOptions = {
      Oldest: { createdAt: 1 },
      'A-Z': { title: 1 },
      'Recently Updated': { updatedAt: -1 },
    };

    const projects = await Project.find(query).sort(sortOptions[sort] || { createdAt: -1 });
    return verificationService.attachToTargets(userId, 'PROJECT', projects);
  }

  async getProjectById(userId, id) {
    const project = await Project.findOne({ _id: id, userId });
    if (!project) throw ApiError.notFound('Project not found');
    return verificationService.attachToTarget(userId, 'PROJECT', project);
  }

  async updateProject(userId, id, projectData, files = []) {
    const project = await Project.findOne({ _id: id, userId });
    if (!project) throw ApiError.notFound('Project not found');

    Object.assign(project, pickProjectFields(projectData));

    const requestedScreenshots = projectData.existingScreenshots ?? projectData.screenshots;
    if (requestedScreenshots !== undefined) {
      const discardedScreenshots = project.screenshots.filter(
        (screenshotUrl) => !requestedScreenshots.includes(screenshotUrl)
      );

      project.screenshots = [
        ...requestedScreenshots,
        ...getUploadedScreenshotUrls(files),
      ];
      await removeStoredScreenshots(discardedScreenshots);
    } else if (files.length > 0) {
      project.screenshots.push(...getUploadedScreenshotUrls(files));
    }

    await project.save();
    return verificationService.attachToTarget(userId, 'PROJECT', project);
  }

  async deleteProject(userId, id) {
    const project = await Project.findOne({ _id: id, userId });
    if (!project) throw ApiError.notFound('Project not found');

    await removeStoredScreenshots(project.screenshots);
    await Project.deleteOne({ _id: id });
  }
}

export default new ProjectService();
