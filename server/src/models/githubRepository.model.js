import mongoose from 'mongoose';

const githubRepositorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    githubAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GitHubAccount',
      required: true,
      index: true,
    },
    repositoryId: {
      type: Number,
      required: true,
      index: true,
    },
    repositoryName: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    htmlUrl: {
      type: String,
      required: true,
      trim: true,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    isFork: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    defaultBranch: {
      type: String,
      default: 'main',
    },
    language: {
      type: String,
      trim: true,
      default: null,
    },
    languages: {
      type: [String],
      default: [],
    },
    stars: {
      type: Number,
      min: 0,
      default: 0,
    },
    forks: {
      type: Number,
      min: 0,
      default: 0,
    },
    watchers: {
      type: Number,
      min: 0,
      default: 0,
    },
    openIssues: {
      type: Number,
      min: 0,
      default: 0,
    },
    createdAtGithub: {
      type: Date,
      default: null,
    },
    updatedAtGithub: {
      type: Date,
      default: null,
    },
    pushedAtGithub: {
      type: Date,
      default: null,
    },
    sizeKb: {
      type: Number,
      min: 0,
      default: 0,
    },
    readmePresent: {
      type: Boolean,
      default: false,
    },
    lastAnalyzedAt: {
      type: Date,
      default: null,
      index: true,
    },
    syncVersion: {
      type: String,
      default: '1.0',
    },
  },
  {
    timestamps: true,
  }
);

githubRepositorySchema.index({ userId: 1, repositoryId: 1 }, { unique: true });
githubRepositorySchema.index({ userId: 1, fullName: 1 });

const GitHubRepository = mongoose.models.GitHubRepository || mongoose.model('GitHubRepository', githubRepositorySchema);

export default GitHubRepository;
