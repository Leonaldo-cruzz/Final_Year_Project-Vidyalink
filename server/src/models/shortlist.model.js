import mongoose from 'mongoose';

export const SHORTLIST_STATUSES = ['SHORTLISTED', 'REMOVED'];

const shortlistSchema = new mongoose.Schema(
  {
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recruiter ID is required'],
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes must not exceed 1000 characters'],
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: SHORTLIST_STATUSES,
        message: 'Status must be either SHORTLISTED or REMOVED',
      },
      default: 'SHORTLISTED',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

shortlistSchema.index({ recruiterId: 1, studentId: 1 }, { unique: true });
shortlistSchema.index({ recruiterId: 1, status: 1, createdAt: -1 });

const Shortlist = mongoose.models.Shortlist || mongoose.model('Shortlist', shortlistSchema);

export default Shortlist;
