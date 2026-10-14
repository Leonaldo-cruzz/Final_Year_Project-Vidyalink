/* global AbortController, clearTimeout, fetch, setTimeout, URL */

import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import Project from '../models/project.model.js';
import User from '../models/user.model.js';
import Profile from '../models/profile.model.js';
import AIEvaluation from '../models/aiEvaluation.model.js';
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

  async getProjects(
    userId,
    {
      branch,
      graduationYear,
      minAiScore,
      maxAiScore,
      category,
      technology,
      search,
      filter,
      sort,
      page = 1,
      limit = 12,
    } = {},
    userRole = 'student'
  ) {
    const isRecruiterOrAlumni = ['alumni', 'recruiter'].includes(userRole);
    const isAdmin = userRole === 'admin';

    const hasCandidateFilter = Boolean(
      (branch !== undefined && branch !== null && branch !== '') ||
      (graduationYear !== undefined && graduationYear !== null && graduationYear !== '') ||
      (minAiScore !== undefined && minAiScore !== null && minAiScore !== '') ||
      (maxAiScore !== undefined && maxAiScore !== null && maxAiScore !== '')
    );

    if (hasCandidateFilter && !['recruiter', 'admin', 'alumni'].includes(userRole)) {
      throw ApiError.forbidden('Candidate search filters are restricted to recruiters and administrators');
    }

    const query = {};

    if (isRecruiterOrAlumni) {
      // Security: Recruiters and alumni can ONLY ever discover Verified projects
      query.verificationStatus = 'Verified';
    } else if (isAdmin) {
      if (filter === 'Verified' || filter === 'Pending' || filter === 'Rejected') {
        query.verificationStatus = filter;
      }
    } else {
      query.userId = userId;
      if (filter === 'Verified' || filter === 'Pending' || filter === 'Rejected') {
        query.verificationStatus = filter;
      }
    }

    if (['Completed', 'In Progress', 'Prototype', 'Archived'].includes(filter)) {
      query.projectStatus = filter;
    } else if (filter === 'Featured') {
      query.featured = true;
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (technology && technology.trim()) {
      query.technologies = {
        $elemMatch: { $regex: new RegExp(escapeRegExp(technology.trim()), 'i') },
      };
    }

    if (search?.trim()) {
      const searchRegex = new RegExp(escapeRegExp(search.trim()), 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: searchRegex },
          { shortDescription: searchRegex },
          { detailedDescription: searchRegex },
          { domain: searchRegex },
          { technologies: searchRegex },
        ],
      });
    }

    let candidateStudentFilterApplied = false;
    let matchingCandidateUserIds = null;

    if (branch && branch.trim()) {
      candidateStudentFilterApplied = true;
      const branchRegex = new RegExp(escapeRegExp(branch.trim()), 'i');
      const [usersWithBranch, profilesWithBranch] = await Promise.all([
        User.find({ role: 'student', branch: branchRegex }).select('_id'),
        Profile.find({ branch: branchRegex }).select('user'),
      ]);

      const branchIds = new Set([
        ...usersWithBranch.map((u) => u._id.toString()),
        ...profilesWithBranch.map((p) => p.user?.toString()).filter(Boolean),
      ]);
      matchingCandidateUserIds = branchIds;
    }

    if (graduationYear !== undefined && graduationYear !== null && graduationYear !== '') {
      candidateStudentFilterApplied = true;
      const gradYearNum = Number(graduationYear);
      const [usersWithGrad, profilesWithGrad] = await Promise.all([
        User.find({ role: 'student', graduationYear: gradYearNum }).select('_id'),
        Profile.find({ graduationYear: gradYearNum }).select('user'),
      ]);

      const gradIds = new Set([
        ...usersWithGrad.map((u) => u._id.toString()),
        ...profilesWithGrad.map((p) => p.user?.toString()).filter(Boolean),
      ]);

      if (matchingCandidateUserIds === null) {
        matchingCandidateUserIds = gradIds;
      } else {
        matchingCandidateUserIds = new Set(
          [...matchingCandidateUserIds].filter((id) => gradIds.has(id))
        );
      }
    }

    if (
      (minAiScore !== undefined && minAiScore !== null && minAiScore !== '') ||
      (maxAiScore !== undefined && maxAiScore !== null && maxAiScore !== '')
    ) {
      candidateStudentFilterApplied = true;
      const minScore =
        minAiScore !== undefined && minAiScore !== null && minAiScore !== ''
          ? Number(minAiScore)
          : null;
      const maxScore =
        maxAiScore !== undefined && maxAiScore !== null && maxAiScore !== ''
          ? Number(maxAiScore)
          : null;

      const scoreMatch = {};
      if (minScore !== null) scoreMatch.$gte = minScore;
      if (maxScore !== null) scoreMatch.$lte = maxScore;

      const pipeline = [
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$studentId',
            latestScore: { $first: '$overallScore' },
          },
        },
        {
          $match: {
            latestScore: scoreMatch,
          },
        },
      ];

      const matchingEvals = await AIEvaluation.aggregate(pipeline);
      const aiScoreUserIds = new Set(matchingEvals.map((e) => e._id.toString()));

      if (matchingCandidateUserIds === null) {
        matchingCandidateUserIds = aiScoreUserIds;
      } else {
        matchingCandidateUserIds = new Set(
          [...matchingCandidateUserIds].filter((id) => aiScoreUserIds.has(id))
        );
      }
    }

    if (candidateStudentFilterApplied) {
      const idsArray = Array.from(matchingCandidateUserIds);
      if (idsArray.length === 0) {
        query.userId = { $in: [] };
      } else {
        const objectIds = idsArray.map((id) => new mongoose.Types.ObjectId(id));
        if (query.userId) {
          if (!matchingCandidateUserIds.has(query.userId.toString())) {
            query.userId = { $in: [] };
          }
        } else {
          query.userId = { $in: objectIds };
        }
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const total = await Project.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(total / limitNum));
    const hasMore = pageNum < totalPages;

    const sortOptions = {
      Oldest: { createdAt: 1 },
      'A-Z': { title: 1 },
      'Recently Updated': { updatedAt: -1 },
      Newest: { createdAt: -1 },
    };
    const sortCriteria = sortOptions[sort] || { createdAt: -1 };

    const rawProjects = await Project.find(query)
      .populate('userId', 'fullName email avatar college branch graduationYear')
      .sort(sortCriteria)
      .skip(skip)
      .limit(limitNum);

    const studentIds = [
      ...new Set(
        rawProjects
          .map((p) => (p.userId?._id ? p.userId._id.toString() : p.userId?.toString()))
          .filter(Boolean)
      ),
    ];

    let evalMap = new Map();
    let profileMap = new Map();

    if (studentIds.length > 0) {
      const studentObjectIds = studentIds.map((id) => new mongoose.Types.ObjectId(id));
      const [evaluations, profiles] = await Promise.all([
        AIEvaluation.find({ studentId: { $in: studentObjectIds } }).sort({ createdAt: -1 }),
        Profile.find({ user: { $in: studentObjectIds } }).select('user branch graduationYear college'),
      ]);

      evaluations.forEach((ev) => {
        const sId = ev.studentId?.toString();
        if (sId && !evalMap.has(sId)) {
          evalMap.set(sId, ev);
        }
      });

      profiles.forEach((pr) => {
        const uId = pr.user?.toString();
        if (uId && !profileMap.has(uId)) {
          profileMap.set(uId, pr);
        }
      });
    }

    const projects = rawProjects.map((p) => {
      const obj = p.toObject ? p.toObject() : { ...p };
      const sId = obj.userId?._id ? obj.userId._id.toString() : obj.userId?.toString();
      const evaluation = sId ? evalMap.get(sId) : null;
      const profile = sId ? profileMap.get(sId) : null;

      if (obj.userId && typeof obj.userId === 'object') {
        if (!obj.userId.branch && profile?.branch) {
          obj.userId.branch = profile.branch;
        }
        if (!obj.userId.graduationYear && profile?.graduationYear) {
          obj.userId.graduationYear = profile.graduationYear;
        }
        if (!obj.userId.college && profile?.college) {
          obj.userId.college = profile.college;
        }
      }

      if (evaluation) {
        obj.aiEvaluation = evaluation;
        obj.aiScore = evaluation.overallScore;
      } else {
        obj.aiEvaluation = null;
        obj.aiScore = null;
      }

      return obj;
    });

    const pagination = {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasMore,
    };

    projects.pagination = pagination;
    projects.total = total;
    projects.page = pageNum;
    projects.limit = limitNum;
    projects.totalPages = totalPages;
    projects.hasMore = hasMore;

    return projects;
  }

  async getProjectById(userId, id, userRole = 'student') {
    let query;
    if (['admin', 'faculty'].includes(userRole)) {
      query = { _id: id };
    } else if (['alumni', 'recruiter'].includes(userRole)) {
      query = { _id: id, verificationStatus: 'Verified' };
    } else {
      query = { _id: id, userId };
    }
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
