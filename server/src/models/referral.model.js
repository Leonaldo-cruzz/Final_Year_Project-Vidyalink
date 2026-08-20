import mongoose from 'mongoose';

// ─── Constants ────────────────────────────────────────────────────────────────

export const REFERRAL_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  REFERRED: 'REFERRED',
  REJECTED: 'REJECTED',
  CLOSED: 'CLOSED',
});

const STATUS_VALUES = Object.values(REFERRAL_STATUS);

// ─── Schema ───────────────────────────────────────────────────────────────────

const referralSchema = new mongoose.Schema(
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

    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      minlength: [1, 'Company name cannot be empty'],
      maxlength: [200, 'Company name must not exceed 200 characters'],
    },

    jobTitle: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      minlength: [1, 'Job title cannot be empty'],
      maxlength: [150, 'Job title must not exceed 150 characters'],
    },

    jobUrl: {
      type: String,
      trim: true,
      maxlength: [2048, 'Job URL must not exceed 2048 characters'],
      default: null,
    },

    message: {
      type: String,
      trim: true,
      maxlength: [2000, 'Message must not exceed 2000 characters'],
      default: null,
    },

    status: {
      type: String,
      enum: {
        values: STATUS_VALUES,
        message: `Status must be one of: ${STATUS_VALUES.join(', ')}`,
      },
      default: REFERRAL_STATUS.DRAFT,
    },

    referredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────

referralSchema.index({ alumniId: 1, status: 1 });
referralSchema.index({ studentId: 1 });
referralSchema.index({ alumniId: 1 });

// ─── Export ───────────────────────────────────────────────────────────────────

const Referral = mongoose.model('Referral', referralSchema);

export default Referral;
