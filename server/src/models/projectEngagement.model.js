import mongoose from 'mongoose';

export const ENGAGEMENT_STATUSES = [
  'Not Started',
  'In Progress',
  'Completed',
  'On Hold',
  'Cancelled',
];

const projectEngagementSchema = new mongoose.Schema(
  {
    projectOpportunityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      unique: true,
      index: true,
      alias: 'project',
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      alias: 'student',
    },
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      alias: 'recruiter',
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
      alias: 'faculty',
    },
    status: {
      type: String,
      enum: ENGAGEMENT_STATUSES,
      default: 'Not Started',
      index: true,
    },
    progressPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    currentMilestone: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    expectedEndDate: {
      type: Date,
      default: null,
    },
    completedDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

projectEngagementSchema.index({ studentId: 1, status: 1, updatedAt: -1 });
projectEngagementSchema.index({ recruiterId: 1, status: 1, updatedAt: -1 });
projectEngagementSchema.index({ facultyId: 1, status: 1, updatedAt: -1 });

const ProjectEngagement = mongoose.model('ProjectEngagement', projectEngagementSchema);

export default ProjectEngagement;
