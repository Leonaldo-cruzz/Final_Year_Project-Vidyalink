import mongoose from 'mongoose';

// ─── Schema ───────────────────────────────────────────────────────────────────

const skillEndorsementSchema = new mongoose.Schema(
  {
    alumniId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Alumni ID is required'],
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
    },

    /**
     * The endorsed skill — must be present on the student's profile.skills
     * array. Validated at the service layer before document creation.
     */
    skill: {
      type: String,
      required: [true, 'Skill is required'],
      trim: true,
      minlength: [1, 'Skill cannot be empty'],
      maxlength: [50, 'Skill must not exceed 50 characters'],
    },

    message: {
      type: String,
      trim: true,
      maxlength: [500, 'Endorsement message must not exceed 500 characters'],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────

/**
 * Compound unique index prevents duplicate endorsements from the same alumni
 * for the same student and skill combination.
 */
skillEndorsementSchema.index(
  { alumniId: 1, studentId: 1, skill: 1 },
  { unique: true }
);

skillEndorsementSchema.index({ studentId: 1 });
skillEndorsementSchema.index({ alumniId: 1 });

// ─── Export ───────────────────────────────────────────────────────────────────

const SkillEndorsement = mongoose.model('SkillEndorsement', skillEndorsementSchema);

export default SkillEndorsement;
