import mongoose from 'mongoose';

const mockInterviewSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
      index: true,
    },
    alumni: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Alumni is required'],
      index: true,
    },
    roleTarget: {
      type: String,
      required: [true, 'Target role or topic is required'],
      trim: true,
      maxlength: 150,
    },
    mode: {
      type: String,
      enum: ['ONLINE', 'OFFLINE'],
      default: 'ONLINE',
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
      maxlength: 250,
      default: null,
    },
    scheduledDate: {
      type: Date,
      default: null,
    },
    durationMinutes: {
      type: Number,
      min: 15,
      max: 180,
      default: 45,
    },
    status: {
      type: String,
      enum: ['REQUESTED', 'ACCEPTED', 'SCHEDULED', 'COMPLETED', 'DECLINED', 'CANCELLED'],
      default: 'REQUESTED',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      technicalSkills: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: '',
      },
      communication: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: '',
      },
      strengths: {
        type: [String],
        default: [],
      },
      improvements: {
        type: [String],
        default: [],
      },
      detailedSummary: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: '',
      },
      completedAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

mockInterviewSchema.index({ student: 1, alumni: 1, status: 1 });

const MockInterview = mongoose.model('MockInterview', mockInterviewSchema);

export default MockInterview;
