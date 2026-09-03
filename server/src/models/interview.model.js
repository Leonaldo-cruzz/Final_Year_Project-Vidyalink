import mongoose from 'mongoose';

// ─── Constants ────────────────────────────────────────────────────────────────

export const INTERVIEW_MODES = ['ONLINE', 'OFFLINE'];

export const INTERVIEW_STATUSES = [
  'SCHEDULED',
  'RESCHEDULED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
];

// Terminal statuses: no further transitions allowed without admin override
export const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED', 'NO_SHOW'];

// ─── Schema ───────────────────────────────────────────────────────────────────

const interviewSchema = new mongoose.Schema(
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
    // Optional: tie interview to a specific project being evaluated
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    // Optional: link to the shortlist record that triggered this interview
    shortlistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shortlist',
      default: null,
    },
    title: {
      type: String,
      trim: true,
      required: [true, 'Interview title is required'],
      maxlength: [200, 'Title must not exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description must not exceed 2000 characters'],
      default: null,
    },
    // ISO 8601 datetime; must be in the future when created
    scheduledAt: {
      type: Date,
      required: [true, 'Scheduled date and time is required'],
      index: true,
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [15, 'Duration must be at least 15 minutes'],
      max: [180, 'Duration must not exceed 180 minutes'],
    },
    mode: {
      type: String,
      enum: {
        values: INTERVIEW_MODES,
        message: 'Mode must be either ONLINE or OFFLINE',
      },
      required: [true, 'Interview mode is required'],
    },
    // Required for ONLINE interviews; null for OFFLINE
    meetingUrl: {
      type: String,
      trim: true,
      maxlength: [500, 'Meeting URL must not exceed 500 characters'],
      default: null,
    },
    // Required for OFFLINE interviews; null for ONLINE
    location: {
      type: String,
      trim: true,
      maxlength: [500, 'Location must not exceed 500 characters'],
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: INTERVIEW_STATUSES,
        message: `Status must be one of: ${INTERVIEW_STATUSES.join(', ')}`,
      },
      default: 'SCHEDULED',
      index: true,
    },
    // Private recruiter-only notes (not shown to students)
    recruiterNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Recruiter notes must not exceed 2000 characters'],
      default: null,
    },
    // Candidate's own notes / feedback (can be set by student)
    candidateNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Candidate notes must not exceed 2000 characters'],
      default: null,
    },
    // Reason populated when status becomes CANCELLED
    cancelReason: {
      type: String,
      trim: true,
      maxlength: [1000, 'Cancel reason must not exceed 1000 characters'],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Primary list/filter query for recruiter's own dashboard
interviewSchema.index({ recruiterId: 1, status: 1, scheduledAt: -1 });

// Student's view of their own interviews
interviewSchema.index({ studentId: 1, status: 1, scheduledAt: -1 });

// Overlap detection: find all interviews for a recruiter within a time window
interviewSchema.index({ recruiterId: 1, scheduledAt: 1 });

// Date-range filters used by both recruiter and student views
interviewSchema.index({ scheduledAt: 1, status: 1 });

// ─── Model ────────────────────────────────────────────────────────────────────

const Interview =
  mongoose.models.Interview || mongoose.model('Interview', interviewSchema);

export default Interview;


