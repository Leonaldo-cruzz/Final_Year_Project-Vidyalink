import mongoose from 'mongoose';

export const REFERRAL_STATUSES = ['active', 'closed'];

const referralSchema = new mongoose.Schema(
  {
    alumni: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    role: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    requirements: {
      type: [{ type: String, trim: true, maxlength: 50 }],
      default: [],
    },
    applyUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
    contactEmail: {
      type: String,
      trim: true,
      maxlength: 255,
      default: null,
    },
    status: {
      type: String,
      enum: REFERRAL_STATUSES,
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

referralSchema.index({ status: 1, createdAt: -1 });
referralSchema.index({ alumni: 1, createdAt: -1 });

const Referral = mongoose.models.Referral || mongoose.model('Referral', referralSchema);

export default Referral;
