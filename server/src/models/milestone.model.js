import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema(
  {
    engagement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProjectEngagement',
      required() {
        return !this.workspace;
      },
      index: true,
    },
    // Kept temporarily for the existing legacy workspace flow. New engagement
    // workspace records use `engagement` as the authoritative parent.
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required() {
        return !this.engagement;
      },
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 150,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 2000,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    order: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'submitted', 'verified', 'rejected'],
      default: 'pending',
      index: true,
    },
    deliverableUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
    deliverableNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

milestoneSchema.index({ workspace: 1, order: 1 });
milestoneSchema.index({ engagement: 1, order: 1 });

milestoneSchema.virtual('deliverables', {
  ref: 'Deliverable',
  localField: '_id',
  foreignField: 'milestone',
});

const Milestone = mongoose.model('Milestone', milestoneSchema);

export default Milestone;
