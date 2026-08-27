import mongoose from 'mongoose';

const skillItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    canonicalName: { type: String, default: null, trim: true },
    category: { type: String, default: 'other', trim: true },
    sources: { type: [String], default: [] },
    evidence: { type: [String], default: [] },
    evidenceCount: { type: Number, default: 0, min: 0 },
    confidence: { type: Number, default: 0, min: 0, max: 1 },
    verified: { type: Boolean, default: true },
    verifiedProjectUsage: { type: Boolean, default: false },
    githubEvidence: { type: Boolean, default: false },
    certificateEvidence: { type: Boolean, default: false },
    alumniEndorsements: { type: Boolean, default: false },
  },
  { _id: false }
);

const studentSkillProfileSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio', default: null, index: true },
    skills: { type: [skillItemSchema], default: [] },
    totalSkillsCount: { type: Number, default: 0, min: 0 },
    version: { type: String, default: '1.0' },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

studentSkillProfileSchema.index({ studentId: 1, createdAt: -1 });

const StudentSkillProfile = mongoose.models.StudentSkillProfile
  || mongoose.model('StudentSkillProfile', studentSkillProfileSchema);

export default StudentSkillProfile;
