/* global AbortController, clearTimeout, fetch, setTimeout, URL */

import fs from 'node:fs/promises';
import path from 'node:path';
import Project from '../models/project.model.js';
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
      verificationStatus: 'Pending',
    });

    return project;
  }

  async getProjects(userId, { filter, search, sort } = {}, userRole = 'student') {
    const query = userRole === 'alumni' ? { verificationStatus: 'Verified' } : { userId };

    if (filter === 'Verified' || filter === 'Pending') {
      query.verificationStatus = filter;
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

    return Project.find(query)
      .populate('userId', 'fullName email avatar college branch graduationYear')
      .sort(sortOptions[sort] || { createdAt: -1 });
  }

  async getProjectById(userId, id, userRole = 'student') {
    const query = ['admin', 'faculty', 'alumni'].includes(userRole)
      ? { _id: id }
      : { _id: id, userId };
    const project = await Project.findOne(query)
      .populate('userId', 'fullName email avatar college branch graduationYear');
    if (!project) throw ApiError.notFound('Project not found');
    return project;
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
    return project;
  }

  async deleteProject(userId, id) {
    const project = await Project.findOne({ _id: id, userId });
    if (!project) throw ApiError.notFound('Project not found');

    await removeStoredScreenshots(project.screenshots);
    await Project.deleteOne({ _id: id });
  }

  /**
   * Performs a real HTTP HEAD request to the project's liveDeployment URL
   * and updates deploymentStatus based on the actual result.
   *
   * States:
   *  not_provided — no URL was set on the project
   *  pending      — check in progress (transient)
   *  reachable    — URL returned 2xx or 3xx
   *  unreachable  — URL returned 4xx or 5xx
   *  failed       — network error, timeout, or invalid URL
   */
  async verifyDeployment(userId, id) {
    const project = await Project.findOne({ _id: id, userId });
    if (!project) throw ApiError.notFound('Project not found');

    const url = project.liveDeployment?.trim();
    if (!url) {
      project.deploymentStatus = 'not_provided';
      await project.save();
      return project;
    }

    // Validate URL format before attempting network request
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Only http/https URLs are supported');
      }
    } catch {
      project.deploymentStatus = 'failed';
      await project.save();
      return project;
    }

    // Mark as pending while the check runs (save to DB)
    project.deploymentStatus = 'pending';
    await project.save();

    const TIMEOUT_MS = 8_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(parsedUrl.href, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': 'VidyaLink-DeploymentVerifier/1.0' },
      });

      project.deploymentStatus = response.ok || (response.status >= 300 && response.status < 400)
        ? 'reachable'
        : 'unreachable';
    } catch (err) {
      project.deploymentStatus = err.name === 'AbortError' ? 'unreachable' : 'failed';
    } finally {
      clearTimeout(timer);
    }

    await project.save();
    return project;
  }
}

export default new ProjectService();
