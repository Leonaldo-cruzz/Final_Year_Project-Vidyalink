import mongoose from 'mongoose';
import User from '../models/user.model.js';
import Project from '../models/project.model.js';
import Certificate from '../models/certificate.model.js';
import Application from '../models/application.model.js';
import Profile from '../models/profile.model.js';
import Deliverable from '../models/deliverable.model.js';
import ApiError from '../utils/ApiError.js';

const DAY_FORMAT = '%Y-%m-%d';

const emptyVerificationCounts = () => ({ pending: 0, verified: 0, rejected: 0 });

const getDateRange = ({ from, to } = {}) => {
  const now = new Date();
  const defaultFrom = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - 29,
  ));
  const start = from ? new Date(from) : defaultFrom;
  const end = to ? new Date(to) : now;

  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    throw ApiError.badRequest('The date range is invalid');
  }

  return { from: start, to: end };
};

const dateMatch = (field, range) => ({
  [field]: { $gte: range.from, $lte: range.to },
});

const dailyCount = async (Model, field, range, match = {}) => Model.aggregate([
  { $match: { ...match, ...dateMatch(field, range) } },
  {
    $group: {
      _id: {
        $dateToString: {
          format: DAY_FORMAT,
          date: `$${field}`,
          timezone: 'UTC',
        },
      },
      count: { $sum: 1 },
    },
  },
  { $project: { _id: 0, date: '$_id', count: 1 } },
  { $sort: { date: 1 } },
]);

const mergeDailyCounts = (...series) => {
  const counts = new Map();
  series.flat().forEach(({ date, count }) => {
    counts.set(date, (counts.get(date) || 0) + count);
  });
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, count]) => ({ date, count }));
};

const verificationCountPipeline = (field = 'verificationStatus') => [
  {
    $group: {
      _id: null,
      pending: { $sum: { $cond: [{ $eq: [`$${field}`, 'Pending'] }, 1, 0] } },
      verified: { $sum: { $cond: [{ $eq: [`$${field}`, 'Verified'] }, 1, 0] } },
      rejected: { $sum: { $cond: [{ $eq: [`$${field}`, 'Rejected'] }, 1, 0] } },
    },
  },
  { $project: { _id: 0, pending: 1, verified: 1, rejected: 1 } },
];

const getVerificationCounts = async (Model) => {
  const [counts] = await Model.aggregate(verificationCountPipeline());
  return counts || emptyVerificationCounts();
};

const unsupportedVerificationType = () => ({
  tracked: false,
  pending: null,
  verified: null,
  rejected: null,
});

class AdminAnalyticsService {
  async getOverview() {
    const [
      userResult,
      projectCounts,
      certificateCounts,
      applicationResult,
      verifiedStudentResult,
      changesRequested,
    ] = await Promise.all([
      User.aggregate([
        {
          $group: {
            _id: null,
            users: { $sum: 1 },
            students: { $sum: { $cond: [{ $eq: ['$role', 'student'] }, 1, 0] } },
            faculty: { $sum: { $cond: [{ $eq: ['$role', 'faculty'] }, 1, 0] } },
            recruiters: { $sum: { $cond: [{ $eq: ['$role', 'recruiter'] }, 1, 0] } },
            alumni: { $sum: { $cond: [{ $eq: ['$role', 'alumni'] }, 1, 0] } },
          },
        },
        { $project: { _id: 0, users: 1, students: 1, faculty: 1, recruiters: 1, alumni: 1 } },
      ]),
      getVerificationCounts(Project),
      getVerificationCounts(Certificate),
      Application.aggregate([
        {
          $group: {
            _id: null,
            shortlists: { $sum: { $cond: [{ $eq: ['$status', 'Shortlisted'] }, 1, 0] } },
            interviews: {
              $sum: {
                $cond: [{ $ne: [{ $ifNull: ['$interviewDate', null] }, null] }, 1, 0],
              },
            },
            recruiterActivities: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$status',
                      ['Under Review', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected'],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $project: { _id: 0, shortlists: 1, interviews: 1, recruiterActivities: 1 } },
      ]),
      Project.aggregate([
        { $match: { verificationStatus: 'Verified' } },
        { $project: { _id: 0, userId: 1 } },
        {
          $unionWith: {
            coll: Certificate.collection.name,
            pipeline: [
              { $match: { verificationStatus: 'Verified' } },
              { $project: { _id: 0, userId: 1 } },
            ],
          },
        },
        { $group: { _id: '$userId' } },
        { $count: 'count' },
      ]),
      Deliverable.countDocuments({ status: 'changes_requested' }),
    ]);

    const users = userResult[0] || {};
    const applications = applicationResult[0] || {};
    const verifiedStudents = verifiedStudentResult[0]?.count || 0;

    return {
      users: users.users || 0,
      students: users.students || 0,
      faculty: users.faculty || 0,
      recruiters: users.recruiters || 0,
      alumni: users.alumni || 0,
      projects: projectCounts.pending + projectCounts.verified + projectCounts.rejected,
      verifiedProjects: projectCounts.verified,
      pendingVerifications: projectCounts.pending + certificateCounts.pending,
      rejectedVerifications: projectCounts.rejected + certificateCounts.rejected,
      verifiedStudents,
      referrals: null,
      interviews: applications.interviews || 0,
      shortlists: applications.shortlists || 0,
      recruiterActivities: applications.recruiterActivities || 0,
      changesRequested,
      metricAvailability: {
        referrals: false,
        successfulReferrals: false,
        completedInterviews: false,
        cancelledInterviews: false,
      },
      systemHealth: {
        api: 'operational',
        database: mongoose.connection.readyState === 1 ? 'operational' : 'unavailable',
        uptimeSeconds: Math.floor(process.uptime()),
      },
      asOf: new Date().toISOString(),
    };
  }

  async getVerificationAnalytics(query) {
    const range = getDateRange(query);
    const [projectCounts, certificateCounts, changesRequested, projectActivity, certificateActivity] = await Promise.all([
      getVerificationCounts(Project),
      getVerificationCounts(Certificate),
      Deliverable.countDocuments({ status: 'changes_requested' }),
      dailyCount(Project, 'createdAt', range),
      dailyCount(Certificate, 'createdAt', range),
    ]);

    return {
      pending: projectCounts.pending + certificateCounts.pending,
      verified: projectCounts.verified + certificateCounts.verified,
      rejected: projectCounts.rejected + certificateCounts.rejected,
      changesRequested,
      byType: {
        PROFILE: unsupportedVerificationType(),
        PROJECT: { tracked: true, ...projectCounts },
        CERTIFICATE: { tracked: true, ...certificateCounts },
        RESUME: unsupportedVerificationType(),
        GITHUB: unsupportedVerificationType(),
      },
      activityByDate: mergeDailyCounts(projectActivity, certificateActivity),
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      unavailableVerificationTypes: ['PROFILE', 'RESUME', 'GITHUB'],
    };
  }

  async getProjectAnalytics(query) {
    const range = getDateRange(query);
    const [result] = await Project.aggregate([
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalProjects: { $sum: 1 },
                verifiedProjects: { $sum: { $cond: [{ $eq: ['$verificationStatus', 'Verified'] }, 1, 0] } },
                pendingProjects: { $sum: { $cond: [{ $eq: ['$verificationStatus', 'Pending'] }, 1, 0] } },
                rejectedProjects: { $sum: { $cond: [{ $eq: ['$verificationStatus', 'Rejected'] }, 1, 0] } },
                completedProjects: { $sum: { $cond: [{ $eq: ['$projectStatus', 'Completed'] }, 1, 0] } },
                inProgressProjects: { $sum: { $cond: [{ $eq: ['$projectStatus', 'In Progress'] }, 1, 0] } },
              },
            },
            { $project: { _id: 0 } },
          ],
          byCategory: [
            { $group: { _id: { $ifNull: ['$category', 'Unspecified'] }, count: { $sum: 1 } } },
            { $project: { _id: 0, label: '$_id', count: 1 } },
            { $sort: { count: -1, label: 1 } },
          ],
          byDomain: [
            { $group: { _id: { $ifNull: ['$domain', 'Unspecified'] }, count: { $sum: 1 } } },
            { $project: { _id: 0, label: '$_id', count: 1 } },
            { $sort: { count: -1, label: 1 } },
          ],
          overTime: [
            { $match: dateMatch('createdAt', range) },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: DAY_FORMAT,
                    date: '$createdAt',
                    timezone: 'UTC',
                  },
                },
                count: { $sum: 1 },
              },
            },
            { $project: { _id: 0, date: '$_id', count: 1 } },
            { $sort: { date: 1 } },
          ],
        },
      },
    ]);

    return {
      ...(result?.totals?.[0] || {
        totalProjects: 0,
        verifiedProjects: 0,
        pendingProjects: 0,
        rejectedProjects: 0,
        completedProjects: 0,
        inProgressProjects: 0,
      }),
      byCategory: result?.byCategory || [],
      byDomain: result?.byDomain || [],
      projectsOverTime: result?.overTime || [],
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
    };
  }

  async getRecruitmentAnalytics() {
    const [result] = await Application.aggregate([
      {
        $group: {
          _id: null,
          totalShortlists: { $sum: { $cond: [{ $eq: ['$status', 'Shortlisted'] }, 1, 0] } },
          totalInterviews: {
            $sum: {
              $cond: [{ $ne: [{ $ifNull: ['$interviewDate', null] }, null] }, 1, 0],
            },
          },
          scheduledInterviews: {
            $sum: { $cond: [{ $eq: ['$status', 'Interview Scheduled'] }, 1, 0] },
          },
          recruiterActivities: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$status',
                    ['Under Review', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected'],
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $project: { _id: 0, totalShortlists: 1, totalInterviews: 1, scheduledInterviews: 1, recruiterActivities: 1 } },
    ]);

    return {
      totalShortlists: result?.totalShortlists || 0,
      totalInterviews: result?.totalInterviews || 0,
      scheduledInterviews: result?.scheduledInterviews || 0,
      completedInterviews: null,
      cancelledInterviews: null,
      referrals: null,
      successfulReferrals: null,
      recruiterActivities: result?.recruiterActivities || 0,
      unavailableMetrics: [
        'completedInterviews',
        'cancelledInterviews',
        'referrals',
        'successfulReferrals',
      ],
    };
  }

  async getActivity(query) {
    const range = getDateRange(query);
    const [registrations, alumniRegistrations, portfolioUpdates, projectSubmissions, certificateSubmissions, recruiterShortlists, interviews] = await Promise.all([
      dailyCount(User, 'createdAt', range),
      dailyCount(User, 'createdAt', range, { role: 'alumni' }),
      dailyCount(Profile, 'updatedAt', range),
      dailyCount(Project, 'createdAt', range),
      dailyCount(Certificate, 'createdAt', range),
      dailyCount(Application, 'updatedAt', range, { status: 'Shortlisted' }),
      dailyCount(Application, 'interviewDate', range),
    ]);

    return {
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      series: {
        registrations,
        alumniRegistrations,
        portfolioUpdates,
        verificationSubmissions: mergeDailyCounts(projectSubmissions, certificateSubmissions),
        recruiterShortlists,
        interviews,
      },
      unavailableMetrics: ['mentorshipRequests', 'referrals'],
    };
  }
}

export default new AdminAnalyticsService();
