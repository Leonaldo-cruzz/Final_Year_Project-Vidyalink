import mongoose from 'mongoose';

// ─── Constants ────────────────────────────────────────────────────────────────

export const MOCK_INTERVIEW_MODE = Object.freeze({
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
});

export const MOCK_INTERVIEW_STATUS = Object.freeze({
  REQUESTED: 'REQUESTED',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

const MODE_VALUES = Object.values(MOCK_INTERVIEW_MODE);
const STATUS_VALUES = Object.values(MOCK_INTERVIEW_STATUS);

// ─── Schema ───────────────────────────────────────────────────────────────────

const mockInterviewRequestSchema = new mongoose.Schema(
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

    scheduledAt: {
      type: Date,
      required: [true, 'Scheduled date/time is required'],
    },

    durationMinutes: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [15, 'Duration must be at least 15 minutes'],
      max: [240, 'Duration cannot exceed 240 minutes'],
    },

    mode: {
      type: String,
      required: [true, 'Interview mode is required'],
      enum: {
        values: MODE_VALUES,
        message: `Mode must be one of: ${MODE_VALUES.join(', ')}`,
      },
    },

    /**
     * Required when mode is ONLINE (accepted/rescheduled by alumni).
     */
    meetingUrl: {
      type: String,
      trim: true,
      maxlength: [2048, 'Meeting URL must not exceed 2048 characters'],
      default: null,
    },

    /**
     * Required when mode is OFFLINE.
     */
    location: {
      type: String,
      trim: true,
      maxlength: [300, 'Location must not exceed 300 characters'],
      default: null,
    },

    status: {
      type: String,
      enum: {
        values: STATUS_VALUES,
        message: `Status must be one of: ${STATUS_VALUES.join(', ')}`,
      },
      default: MOCK_INTERVIEW_STATUS.REQUESTED,
    },

    /**
     * Provided by the alumni after the interview is COMPLETED.
     */
    feedback: {
      type: String,
      trim: true,
      maxlength: [3000, 'Feedback must not exceed 3000 characters'],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────

mockInterviewRequestSchema.index({ alumniId: 1, status: 1 });
mockInterviewRequestSchema.index({ studentId: 1, status: 1 });
// Used for schedule conflict detection
mockInterviewRequestSchema.index({ alumniId: 1, scheduledAt: 1 });

// ─── Export ───────────────────────────────────────────────────────────────────

const MockInterviewRequest = mongoose.model('MockInterviewRequest', mockInterviewRequestSchema);

export default MockInterviewRequest;
