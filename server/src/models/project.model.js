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
    githubRepository: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
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
    // A recruiter must explicitly mark a project as a public opportunity.
    // Existing student portfolio projects remain private to this matcher.
    opportunity: {
      isOpen: { type: Boolean, default: false },
      visibility: { type: String, enum: ['public', 'private'], default: 'private' },
      requiredSkills: { type: [{ type: String, trim: true, maxlength: 50 }], default: [] },
      preferredSkills: { type: [{ type: String, trim: true, maxlength: 50 }], default: [] },
      minimumExperienceYears: { type: Number, min: 0, max: 50, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

projectSchema.index({ userId: 1, createdAt: -1 });
projectSchema.index({ userId: 1, verificationStatus: 1, projectStatus: 1 });
projectSchema.index({ userId: 1, 'opportunity.isOpen': 1, 'opportunity.visibility': 1 });

const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);

export default Project;
