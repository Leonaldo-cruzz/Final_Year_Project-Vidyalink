import mongoose from 'mongoose';

const matchedSkillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    canonicalName: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: 'other' },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    sources: { type: [String], default: [] },
    isRequired: { type: Boolean, default: true },
  },
  { _id: false }
);

const weakEvidenceSkillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    canonicalName: { type: String, required: true, trim: true },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    reason: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const skillGapAnalysisSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetRole: { type: String, required: true, trim: true },
    matchedSkills: { type: [matchedSkillSchema], default: [] },
    missingRequiredSkills: { type: [String], default: [] },
    missingPreferredSkills: { type: [String], default: [] },
    weakEvidenceSkills: { type: [weakEvidenceSkillSchema], default: [] },
    matchPercentage: { type: Number, min: 0, max: 100, default: 0 },
    analysisVersion: { type: String, default: '1.0' },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

skillGapAnalysisSchema.index({ studentId: 1, createdAt: -1 });
skillGapAnalysisSchema.index({ studentId: 1, targetRole: 1 });

const SkillGapAnalysis = mongoose.models.SkillGapAnalysis
  || mongoose.model('SkillGapAnalysis', skillGapAnalysisSchema);

export default SkillGapAnalysis;

