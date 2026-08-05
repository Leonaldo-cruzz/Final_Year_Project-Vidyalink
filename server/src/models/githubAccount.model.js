import mongoose from 'mongoose';

export const GITHUB_CONNECTION_STATUSES = ['Connected', 'Disconnected', 'Pending'];

const githubAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    githubUsername: {
      type: String,
      required: true,
      trim: true,
      maxlength: 39,
    },
    githubProfileUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },
    avatarUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    followers: {
      type: Number,
      min: 0,
      default: 0,
    },
    following: {
      type: Number,
      min: 0,
      default: 0,
    },
    publicRepos: {
      type: Number,
      min: 0,
      default: 0,
    },
    publicGists: {
      type: Number,
      min: 0,
      default: 0,
    },
    joinedAt: {
      type: Date,
      default: null,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    connectionStatus: {
      type: String,
      enum: GITHUB_CONNECTION_STATUSES,
      default: 'Pending',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const GitHubAccount = mongoose.models.GitHubAccount || mongoose.model('GitHubAccount', githubAccountSchema);

export default GitHubAccount;
