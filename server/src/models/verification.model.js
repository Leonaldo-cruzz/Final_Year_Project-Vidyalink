import mongoose from 'mongoose';

export const VERIFICATION_TARGET_TYPES = Object.freeze([
  'PROFILE',
  'PROJECT',
  'CERTIFICATE',
  'RESUME',
  'GITHUB',
]);

export const VERIFICATION_STATUSES = Object.freeze([
  'PENDING',
  'VERIFIED',
  'REJECTED',
  'CHANGES_REQUESTED',
]);

const verificationSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    targetType: {
      type: String,
      enum: VERIFICATION_TARGET_TYPES,
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: VERIFICATION_STATUSES,
      default: 'PENDING',
      required: true,
      index: true,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

verificationSchema.index({ studentId: 1, targetType: 1, targetId: 1, createdAt: -1 });
verificationSchema.index(
  { studentId: 1, targetType: 1, targetId: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING' } }
);
verificationSchema.index({ status: 1, createdAt: 1 });

const Verification = mongoose.models.Verification || mongoose.model('Verification', verificationSchema);

export default Verification;

