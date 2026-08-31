import mongoose from 'mongoose';

const recruiterProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      minlength: [2, 'Company name must be at least 2 characters'],
      maxlength: [200, 'Company name must not exceed 200 characters'],
      index: true,
    },
    companyWebsite: {
      type: String,
      trim: true,
      maxlength: [2048, 'Company website URL must not exceed 2048 characters'],
      default: null,
    },
    companyDescription: {
      type: String,
      trim: true,
      maxlength: [5000, 'Company description must not exceed 5000 characters'],
      default: null,
    },
    industry: {
      type: String,
      trim: true,
      maxlength: [100, 'Industry must not exceed 100 characters'],
      default: null,
      index: true,
    },
    designation: {
      type: String,
      trim: true,
      maxlength: [100, 'Designation must not exceed 100 characters'],
      default: null,
    },
    location: {
      type: String,
      trim: true,
      maxlength: [200, 'Location must not exceed 200 characters'],
      default: null,
    },
    companyLogo: {
      type: String,
      trim: true,
      maxlength: [2048, 'Company logo URL must not exceed 2048 characters'],
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

recruiterProfileSchema.index({ companyName: 'text', industry: 'text' });

const RecruiterProfile =
  mongoose.models.RecruiterProfile || mongoose.model('RecruiterProfile', recruiterProfileSchema);

export default RecruiterProfile;

