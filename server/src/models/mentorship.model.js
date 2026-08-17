import mongoose from 'mongoose';

const MENTORSHIP_STATUSES = ['Pending', 'Accepted', 'Rejected', 'Completed', 'Cancelled'];

const mentorshipSchema = new mongoose.Schema(
  {
    alumniId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    requestedSkills: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: MENTORSHIP_STATUSES,
      default: 'Pending',
      index: true,
    },
    alumniNotes: {
      type: String,
      trim: true,
      default: null,
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Mentorship = mongoose.models.Mentorship || mongoose.model('Mentorship', mentorshipSchema);

export default Mentorship;
