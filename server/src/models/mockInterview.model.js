import mongoose from 'mongoose';

export const MOCK_INTERVIEW_STATUSES = ['scheduled', 'confirmed', 'completed', 'cancelled'];
export const MOCK_INTERVIEW_MODES = ['online', 'in_person'];

const evaluationSchema = new mongoose.Schema(
  {
    technicalKnowledge: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    problemSolving: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    communication: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    projectUnderstanding: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    confidence: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    overallScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    strengths: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    improvements: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    privateNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    feedbackVisibility: {
      type: String,
      enum: ['published', 'draft'],
      default: 'published',
    },
    evaluatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const mockInterviewSchema = new mongoose.Schema(
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
    mentorship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mentorship',
      default: null,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    mode: {
      type: String,
      enum: MOCK_INTERVIEW_MODES,
      default: 'online',
    },
    meetingLink: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
    focusDomain: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    status: {
      type: String,
      enum: MOCK_INTERVIEW_STATUSES,
      default: 'scheduled',
      index: true,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    evaluation: {
      type: evaluationSchema,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

mockInterviewSchema.index({ alumni: 1, status: 1, scheduledDate: -1 });
mockInterviewSchema.index({ student: 1, status: 1, scheduledDate: -1 });

const MockInterview =
  mongoose.models.MockInterview || mongoose.model('MockInterview', mockInterviewSchema);

export default MockInterview;
