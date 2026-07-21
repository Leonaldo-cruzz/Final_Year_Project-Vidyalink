import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  USER_ROLES_LIST,
  UserRoles,
  ACCOUNT_STATUS_LIST,
  AccountStatus,
  BCRYPT_SALT_ROUNDS,
} from '../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: USER_ROLES_LIST,
        message: 'Role must be one of: ' + USER_ROLES_LIST.join(', '),
      },
      default: UserRoles.STUDENT,
    },
    avatar: {
      type: String,
      default: null,
    },
    college: {
      type: String,
      trim: true,
      default: null,
    },
    branch: {
      type: String,
      trim: true,
      default: null,
    },
    graduationYear: {
      type: Number,
      min: [1900, 'Graduation year must be after 1900'],
      max: [2100, 'Graduation year must be before 2100'],
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      select: false,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ACCOUNT_STATUS_LIST,
        message: 'Status must be one of: ' + ACCOUNT_STATUS_LIST.join(', '),
      },
      default: AccountStatus.ACTIVE,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, BCRYPT_SALT_ROUNDS);
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
