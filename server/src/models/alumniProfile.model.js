import mongoose from 'mongoose';

const alumniProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      unique: true,
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: 150,
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true,
      maxlength: 150,
    },
    industry: {
      type: String,
      required: [true, 'Industry is required'],
      trim: true,
      maxlength: 100,
    },
    experience: {
      type: Number,
      min: [0, 'Experience years must be positive'],
      max: [70, 'Experience years cannot exceed 70'],
      default: 0,
    },
    experienceSummary: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    skills: {
      type: [String],
      default: [],
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    location: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
    },
    linkedin: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
    github: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
    companyWebsite: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
    isVerifiedAlumni: {
      type: Boolean,
      default: true,
    },
    mentorshipAvailable: {
      type: Boolean,
      default: true,
    },
    mockInterviewsAvailable: {
      type: Boolean,
      default: true,
    },
    referralsAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

alumniProfileSchema.index({ company: 1, industry: 1 });
alumniProfileSchema.index({ skills: 1 });

const AlumniProfile = mongoose.model('AlumniProfile', alumniProfileSchema);

export default AlumniProfile;
