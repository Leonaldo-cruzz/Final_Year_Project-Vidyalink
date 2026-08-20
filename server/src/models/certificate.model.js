import mongoose from 'mongoose';

export const CERTIFICATE_CATEGORIES = [
  'Internship',
  'Course',
  'Hackathon',
  'Workshop',
  'Competition',
  'Research',
  'Cloud Certification',
  'Other',
];

export const VERIFICATION_STATUS = ['Pending', 'Verified', 'Rejected'];

const certificateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    issuer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    category: {
      type: String,
      enum: CERTIFICATE_CATEGORIES,
      default: 'Other',
      required: true,
    },
    issueDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    credentialId: {
      type: String,
      trim: true,
      default: null,
    },
    credentialUrl: {
      type: String,
      trim: true,
      default: null,
    },
    certificateFile: {
      originalFileName: { type: String, required: true },
      storedFileName: { type: String, required: true },
      fileUrl: { type: String, required: true },
      fileSize: { type: Number, required: true },
      mimeType: { type: String, required: true },
    },
    skills: {
      type: [String],
      default: [],
    },
    verificationStatus: {
      type: String,
      enum: VERIFICATION_STATUS,
      default: 'Pending',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

certificateSchema.index({ verificationStatus: 1, createdAt: -1 });

const Certificate = mongoose.models.Certificate || mongoose.model('Certificate', certificateSchema);

export default Certificate;
