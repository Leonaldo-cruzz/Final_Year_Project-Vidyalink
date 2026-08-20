import mongoose from 'mongoose';

// ─── Constants ────────────────────────────────────────────────────────────────

const INDUSTRIES = Object.freeze([
  'Technology',
  'Finance',
  'Healthcare',
  'Education',
  'Manufacturing',
  'Retail',
  'Consulting',
  'Media',
  'Government',
  'Non-profit',
  'Other',
]);

// ─── Schema ───────────────────────────────────────────────────────────────────

const alumniProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },

    company: {
      type: String,
      trim: true,
      maxlength: [200, 'Company name must not exceed 200 characters'],
      default: null,
    },

    designation: {
      type: String,
      trim: true,
      maxlength: [150, 'Designation must not exceed 150 characters'],
      default: null,
    },

    industry: {
      type: String,
      trim: true,
      enum: {
        values: INDUSTRIES,
        message: `Industry must be one of: ${INDUSTRIES.join(', ')}`,
      },
      default: null,
    },

    experienceYears: {
      type: Number,
      min: [0, 'Experience years cannot be negative'],
      max: [60, 'Experience years cannot exceed 60'],
      default: null,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: [2000, 'Bio must not exceed 2000 characters'],
      default: null,
    },

    skills: {
      type: [{ type: String, trim: true, maxlength: 50 }],
      default: [],
      validate: {
        validator: (v) => Array.isArray(v) && v.length <= 50,
        message: 'Skills cannot exceed 50 entries',
      },
    },

    linkedinUrl: {
      type: String,
      trim: true,
      maxlength: [2048, 'LinkedIn URL must not exceed 2048 characters'],
      default: null,
    },

    githubUrl: {
      type: String,
      trim: true,
      maxlength: [2048, 'GitHub URL must not exceed 2048 characters'],
      default: null,
    },

    companyWebsite: {
      type: String,
      trim: true,
      maxlength: [2048, 'Company website URL must not exceed 2048 characters'],
      default: null,
    },

    location: {
      type: String,
      trim: true,
      maxlength: [150, 'Location must not exceed 150 characters'],
      default: null,
    },

    /**
     * Verification is managed exclusively by admin.
     * Only verified alumni may use mentorship, endorsement, referral, and
     * mock-interview features.
     */
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────

alumniProfileSchema.index({ userId: 1 }, { unique: true });
alumniProfileSchema.index({ isVerified: 1 });
alumniProfileSchema.index({ industry: 1 });
alumniProfileSchema.index({ isVerified: 1, industry: 1 });

// ─── Export ───────────────────────────────────────────────────────────────────

const AlumniProfile = mongoose.model('AlumniProfile', alumniProfileSchema);

export { INDUSTRIES };
export default AlumniProfile;
