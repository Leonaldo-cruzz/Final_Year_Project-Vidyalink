import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    storageKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1024,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

const commentSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 2000,
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const deliverableSchema = new mongoose.Schema(
  {
    engagement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProjectEngagement',
      required: true,
      index: true,
    },
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Milestone',
      required: true,
      index: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
      trim: true,
      maxlength: 3000,
      default: null,
    },
    url: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'changes_requested', 'approved'],
      default: 'draft',
      index: true,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewFeedback: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    comments: {
      type: [commentSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

deliverableSchema.index({ milestone: 1, createdAt: -1 });
deliverableSchema.index({ engagement: 1, status: 1, updatedAt: -1 });

const Deliverable = mongoose.model('Deliverable', deliverableSchema);

export default Deliverable;
