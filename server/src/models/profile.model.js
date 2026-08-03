import mongoose from 'mongoose';
import { URL } from 'node:url';

const currentYear = new Date().getFullYear();
const MAX_PROFILE_LIST_ENTRIES = 50;

const isValidHttpUrl = (value) => {
  if (value === null || value === undefined) return true;

  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
};

const optionalUrlField = (fieldName) => ({
  type: String,
  trim: true,
  maxlength: 2048,
  default: null,
  validate: {
    validator: isValidHttpUrl,
    message: ({ value }) => `${value} is not a valid ${fieldName} URL`,
  },
});

const stringListField = (fieldName) => ({
  type: [{ type: String, trim: true, minlength: 1, maxlength: 50 }],
  default: [],
  validate: {
    validator: (values) => Array.isArray(values) && values.length <= MAX_PROFILE_LIST_ENTRIES,
    message: `${fieldName} cannot exceed ${MAX_PROFILE_LIST_ENTRIES} entries`,
  },
});

const profileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    college: {
      type: String,
      required: [true, 'College is required'],
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    degree: {
      type: String,
      trim: true,
      maxlength: 150,
      default: null,
    },
    branch: {
      type: String,
      required: [true, 'Branch is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    graduationYear: {
      type: Number,
      required: [true, 'Graduation year is required'],
      min: [1900, 'Graduation year must be after 1900'],
      max: currentYear + 20,
    },
    headline: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    profilePicture: optionalUrlField('profile picture'),
    cgpa: {
      type: Number,
      min: 0,
      max: 10,
      default: null,
    },
    skills: {
      ...stringListField('Skills'),
    },
    interests: {
      ...stringListField('Interests'),
    },
    github: optionalUrlField('GitHub'),
    linkedin: optionalUrlField('LinkedIn'),
    portfolio: optionalUrlField('portfolio'),
    resumeUrl: optionalUrlField('resume'),
    profileCompletion: {
      type: Number,
      min: [0, 'Profile completion cannot be negative'],
      max: [100, 'Profile completion cannot exceed 100'],
      validate: {
        validator: Number.isInteger,
        message: 'Profile completion must be a whole number',
      },
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

profileSchema.index({ user: 1 }, { unique: true });

const Profile = mongoose.model('Profile', profileSchema);

export default Profile;
