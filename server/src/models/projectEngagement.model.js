import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'engagement_created',
        'engagement_updated',
        'milestone_created',
        'milestone_updated',
        'deliverable_created',
        'deliverable_submitted',
        'deliverable_reviewed',
        'comment_added',
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Milestone',
      default: null,
    },
    deliverable: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deliverable',
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const projectEngagementSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'terminated'],
      default: 'active',
      index: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    completedDate: {
      type: Date,
      default: null,
    },
    progressPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    activity: {
      type: [activitySchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

projectEngagementSchema.index({ project: 1, student: 1 }, { unique: true });
projectEngagementSchema.index({ student: 1, status: 1, updatedAt: -1 });
projectEngagementSchema.index({ recruiter: 1, status: 1, updatedAt: -1 });
projectEngagementSchema.index({ faculty: 1, status: 1, updatedAt: -1 });

projectEngagementSchema.virtual('milestones', {
  ref: 'Milestone',
  localField: '_id',
  foreignField: 'engagement',
});

projectEngagementSchema.virtual('deliverables', {
  ref: 'Deliverable',
  localField: '_id',
  foreignField: 'engagement',
});

const ProjectEngagement = mongoose.model('ProjectEngagement', projectEngagementSchema);

export default ProjectEngagement;
