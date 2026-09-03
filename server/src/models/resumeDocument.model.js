import mongoose from 'mongoose';

const RESUME_SECTIONS = [
  'summary', 'skills', 'education', 'experience', 'projects', 'certifications', 'achievements', 'links',
];

const resumeDocumentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetRole: { type: String, required: true, trim: true, maxlength: 150 },
  targetCompany: { type: String, trim: true, maxlength: 200, default: null },
  jobDescription: { type: String, trim: true, maxlength: 10000, default: null },
  requiredSkills: { type: [String], default: [] },
  preferredSkills: { type: [String], default: [] },
  selectedSections: { type: [String], enum: RESUME_SECTIONS, required: true },
  sourceRefs: {
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    certificates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Certificate' }],
  },
  // A self-contained snapshot is needed so prior resume versions do not change when a profile changes.
  content: { type: mongoose.Schema.Types.Mixed, required: true },
  template: { type: String, enum: ['ats-single-column'], default: 'ats-single-column' },
  atsOptimized: { type: Boolean, default: true },
  atsAnalysis: { type: mongoose.Schema.Types.Mixed, default: null },
  version: { type: Number, required: true },
  status: { type: String, enum: ['CURRENT', 'STALE'], default: 'CURRENT' },
  sourceProfileVersion: { type: Date, default: null },
  sourcePortfolioVersion: { type: Date, default: null },
  sourceEvaluationVersion: { type: Date, default: null },
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

resumeDocumentSchema.index({ userId: 1, version: -1 }, { unique: true });

export { RESUME_SECTIONS };
export default mongoose.models.ResumeDocument || mongoose.model('ResumeDocument', resumeDocumentSchema);
