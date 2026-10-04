import mongoose from 'mongoose';

export const PROJECT_CATEGORIES = [
  'Web Development',
  'Mobile App',
  'AI / ML',
  'Cloud',
  'Cyber Security',
  'IoT',
  'Blockchain',
  'Desktop Application',
  'Research',
  'Other',
];

export const PROJECT_STATUSES = ['Completed', 'In Progress', 'Prototype', 'Archived'];
export const VERIFICATION_STATUSES = ['Pending', 'Verified', 'Rejected'];
export const DEPLOYMENT_STATUSES = ['not_provided', 'pending', 'reachable', 'unreachable', 'failed'];

const projectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    shortDescription: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 500,
    },
    detailedDescription: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 5000,
    },
    category: {
      type: String,
      enum: PROJECT_CATEGORIES,
      required: true,
    },
    domain: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },
    technologies: {
      type: [{ type: String, trim: true, maxlength: 50 }],
      required: true,
      validate: {
        validator: (technologies) => technologies.length > 0,
        message: 'At least one technology is required',
      },
    },
    // Manually entered or previously synced GitHub repository URL (html_url).
    // Used as secondary URL match key during sync when githubRepositoryId is absent.
    githubRepository: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
    // ── GitHub Auto-Discovery Fields ─────────────────────────────────────────
    // Stable primary identity key from GitHub's API (repo.id — numeric integer).
    // Idempotent matching: the same repo found on repeat syncs is never duplicated.
    githubRepositoryId: {
      type: Number,
      default: null,
    },
    // Current sync state for this project's GitHub link.
    //  'none'    — no GitHub sync involvement (manual project)
    //  'synced'  — linked and up-to-date with GitHub
    //  'deleted' — was present on last sync but absent now; project is preserved
    githubSyncStatus: {
      type: String,
      enum: ['none', 'synced', 'deleted'],
      default: 'none',
    },
    // Provenance: where the project record originated.
    //  'manual'      — student created directly in VidyaLink
    //  'github_sync' — automatically imported from a GitHub sync
    githubSource: {
      type: String,
      enum: ['manual', 'github_sync'],
      default: 'manual',
    },
    // ─────────────────────────────────────────────────────────────────────────
    liveDeployment: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
    demoVideo: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
    documentationUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
    screenshots: {
      type: [{ type: String, trim: true, maxlength: 2048 }],
      default: [],
    },
    teamMembers: {
      type: [{ type: String, trim: true, maxlength: 100 }],
      default: [],
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    projectStatus: {
      type: String,
      enum: PROJECT_STATUSES,
      default: 'In Progress',
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: VERIFICATION_STATUSES,
      default: 'Pending',
      index: true,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    deploymentStatus: {
      type: String,
      enum: ['not_provided', 'pending', 'reachable', 'unreachable', 'failed'],
      default: 'not_provided',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

projectSchema.index({ userId: 1, createdAt: -1 });
projectSchema.index({ userId: 1, verificationStatus: 1, projectStatus: 1 });
// Sparse compound index: only indexes docs where githubRepositoryId is set (O(1) duplicate lookup)
projectSchema.index({ userId: 1, githubRepositoryId: 1 }, { sparse: true });

const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);

export default Project;
