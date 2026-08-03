import mongoose from 'mongoose';
import crypto from 'crypto';

const portfolioSchema = new mongoose.Schema(
  {
    certificateId: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      unique: true,
    },
    projectTitle: {
      type: String,
      required: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    skillsVerified: {
      type: [String],
      default: [],
    },
    milestonesSummary: [
      {
        title: String,
        completedAt: Date,
      },
    ],
    verificationHash: {
      type: String,
      required: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const generateCertificateId = () => {
  const year = new Date().getFullYear();
  const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `VLC-${year}-${randomHex}`;
};

const Portfolio = mongoose.model('Portfolio', portfolioSchema);

export default Portfolio;
