import mongoose from 'mongoose';

export const MENTORSHIP_STATUSES = ['pending', 'accepted', 'declined', 'completed'];

const mentorshipSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    alumni: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: MENTORSHIP_STATUSES,
      default: 'pending',
      index: true,
    },
    focusSkill: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    scheduledDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

mentorshipSchema.index({ alumni: 1, status: 1, createdAt: -1 });
mentorshipSchema.index({ student: 1, status: 1, createdAt: -1 });

const Mentorship = mongoose.models.Mentorship || mongoose.model('Mentorship', mentorshipSchema);

export default Mentorship;
