import mongoose from 'mongoose';

// ─── Constants ────────────────────────────────────────────────────────────────

export const MENTORSHIP_STATUS = Object.freeze({
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
});

const STATUS_VALUES = Object.values(MENTORSHIP_STATUS);

// ─── Schema ───────────────────────────────────────────────────────────────────

const mentorshipRequestSchema = new mongoose.Schema(
  {
    alumniId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Alumni ID is required'],
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
    },

    topic: {
      type: String,
      required: [true, 'Topic is required'],
      trim: true,
      minlength: [3, 'Topic must be at least 3 characters'],
      maxlength: [200, 'Topic must not exceed 200 characters'],
    },

    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      minlength: [10, 'Message must be at least 10 characters'],
      maxlength: [2000, 'Message must not exceed 2000 characters'],
    },

    status: {
      type: String,
      enum: {
        values: STATUS_VALUES,
        message: `Status must be one of: ${STATUS_VALUES.join(', ')}`,
      },
      default: MENTORSHIP_STATUS.PENDING,
    },

    /**
     * Alumni's optional reply when accepting or declining.
     */
    responseMessage: {
      type: String,
      trim: true,
      maxlength: [2000, 'Response message must not exceed 2000 characters'],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────

mentorshipRequestSchema.index({ alumniId: 1, status: 1 });
mentorshipRequestSchema.index({ studentId: 1, status: 1 });
// Used to enforce no duplicate PENDING request from same student to same alumni
mentorshipRequestSchema.index({ alumniId: 1, studentId: 1, status: 1 });

// ─── Export ───────────────────────────────────────────────────────────────────

const MentorshipRequest = mongoose.model('MentorshipRequest', mentorshipRequestSchema);

export default MentorshipRequest;
