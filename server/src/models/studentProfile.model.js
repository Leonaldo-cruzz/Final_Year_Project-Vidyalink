import mongoose from 'mongoose';

const educationSchema = new mongoose.Schema(
  {
    institution: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    degree: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    fieldOfStudy: {
      type: String,
      trim: true,
      maxlength: 150,
      default: null,
    },
    startYear: {
      type: Number,
      min: 1900,
      max: 2100,
      default: null,
    },
    endYear: {
      type: Number,
      min: 1900,
      max: 2100,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
  },
  { _id: false }
);

const experienceSchema = new mongoose.Schema(
  {
    company: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    position: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    employmentType: {
      type: String,
      trim: true,
      maxlength: 50,
      default: null,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 150,
      default: null,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      default: null,
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
  },
  { _id: false }
);

const certificationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    issuingOrganization: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    issueDate: {
      type: Date,
      default: null,
    },
    credentialId: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
    credentialUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
  },
  { _id: false }
);

const studentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    profilePicture: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: null,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 150,
      default: null,
    },
    college: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
    department: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },
    branch: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },
    graduationYear: {
      type: Number,
      min: 1900,
      max: 2100,
      default: null,
    },
    cgpa: {
      type: Number,
      min: 0,
      max: 10,
      default: null,
    },
    linkedin: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
    githubUsername: {
      type: String,
      trim: true,
      maxlength: 39,
      default: null,
    },
    portfolioWebsite: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
    skills: {
      type: [String],
      default: [],
    },
    education: {
      type: [educationSchema],
      default: [],
    },
    experience: {
      type: [experienceSchema],
      default: [],
    },
    certifications: {
      type: [certificationSchema],
      default: [],
    },
    resume: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);

export default StudentProfile;
