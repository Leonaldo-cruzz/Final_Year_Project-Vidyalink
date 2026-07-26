import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const SALT_ROUNDS = 12;

const ROLES = Object.freeze(["student", "faculty", "alumni", "recruiter", "admin"]);
const STATUSES = Object.freeze(["active", "inactive", "blocked"]);

// ─── Schema Definition ────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Full name must be at least 2 characters"],
      maxlength: [100, "Full name must not exceed 100 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    role: {
      type: String,
      enum: {
        values: ROLES,
        message: `Role must be one of: ${ROLES.join(", ")}`,
      },
      default: "student",
    },

    avatar: {
      type: String,
      default: null,
    },

    college: {
      type: String,
      trim: true,
      maxlength: [200, "College name must not exceed 200 characters"],
      default: null,
    },

    branch: {
      type: String,
      trim: true,
      maxlength: [100, "Branch name must not exceed 100 characters"],
      default: null,
    },

    graduationYear: {
      type: Number,
      min: [1900, "Graduation year must be after 1900"],
      max: [2100, "Graduation year must be before 2100"],
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
        values: STATUSES,
        message: `Status must be one of: ${STATUSES.join(", ")}`,
      },
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Note: email is already indexed via `unique: true` on the field definition.
// Only compound and non-unique secondary indexes are declared here.

userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ role: 1, status: 1 });

// ─── Pre-save Middleware ───────────────────────────────────────────────────────

/**
 * Hash the password before saving only when it has been modified.
 * Prevents re-hashing an already-hashed password on unrelated document updates.
 */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    next();
  } catch (error) {
    next(error);
  }
});

// ─── Instance Methods ─────────────────────────────────────────────────────────

/**
 * Compares a plain-text candidate password against the stored bcrypt hash.
 * NOTE: Requires the password field to be explicitly selected in the query
 *       (e.g., `.select("+password")`), since it has `select: false`.
 *
 * @param {string} candidatePassword - The plain-text password to verify.
 * @returns {Promise<boolean>} Resolves to `true` if the passwords match.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Generates a short-lived JWT access token containing the user's identity.
 *
 * Required environment variables:
 *   - ACCESS_TOKEN_SECRET  (required)
 *   - ACCESS_TOKEN_EXPIRY  (optional, defaults to "15m")
 *
 * @returns {string} Signed JWT access token.
 * @throws {Error} If ACCESS_TOKEN_SECRET is not defined.
 */
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      role: this.role,
      fullName: this.fullName,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN,
    }
  );
};

/**
 * Generates a long-lived JWT refresh token used to rotate access tokens.
 *
 * Required environment variables:
 *   - REFRESH_TOKEN_SECRET  (required)
 *   - REFRESH_TOKEN_EXPIRY  (optional, defaults to "7d")
 *
 * @returns {string} Signed JWT refresh token.
 * @throws {Error} If REFRESH_TOKEN_SECRET is not defined.
 */
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    }
  );
};

// ─── Model Export ─────────────────────────────────────────────────────────────

const User = mongoose.model("User", userSchema);

export default User;
