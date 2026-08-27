import mongoose from 'mongoose';

const githubAnalyticsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    githubAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'GitHubAccount', default: null, index: true },
    repositoryCount: { type: Number, min: 0, default: 0 },
    activeRepositoryCount: { type: Number, min: 0, default: 0 },
    commitCount: { type: Number, min: 0, default: 0 },
    recentCommitCount: { type: Number, min: 0, default: 0 },
    languages: { type: [String], default: [] },
    readmeCoverage: { type: Number, min: 0, max: 100, default: 0 },
    documentationCoverage: { type: Number, min: 0, max: 100, default: 0 },
    contributionActivity: { type: mongoose.Schema.Types.Mixed, default: {} },
    recentActivityDate: { type: Date, default: null },
    analyticsVersion: { type: String, default: '1.0' },
    calculatedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

githubAnalyticsSchema.index({ userId: 1, calculatedAt: -1 });

const GitHubAnalytics = mongoose.models.GitHubAnalytics
  || mongoose.model('GitHubAnalytics', githubAnalyticsSchema);

export default GitHubAnalytics;
