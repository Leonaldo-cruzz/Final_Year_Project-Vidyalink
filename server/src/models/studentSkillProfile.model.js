import mongoose from 'mongoose';

const skillItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    canonicalName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    sources: {
      type: [String],
      default: [],
    },
    evidence: {
      type: [String],
      default: [],
    },
    evidenceCount: {
      type: Number,
      default: 1,
      min: 0,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
  },
  { _id: false }
);

const studentSkillProfileSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    portfolioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Portfolio',
      default: null,
      index: true,
    },
    skills: {
      type: [skillItemSchema],
      default: [],
    },
    totalSkillsCount: {
      type: Number,
      default: 0,
    },
    version: {
      type: String,
      default: '1.0',
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

studentSkillProfileSchema.index({ studentId: 1, createdAt: -1 });

const StudentSkillProfile =
  mongoose.models.StudentSkillProfile ||
  mongoose.model('StudentSkillProfile', studentSkillProfileSchema);

export default StudentSkillProfile;
