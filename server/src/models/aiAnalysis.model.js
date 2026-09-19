import mongoose from 'mongoose';

export const AI_ANALYSIS_TYPES = [
  'ats',
  'skills_extract',
  'skills_gap',
  'github',
  'readiness',
  'recommendations',
];

const aiAnalysisSchema = new mongoose.Schema(
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
    analysisType: {
      type: String,
      enum: AI_ANALYSIS_TYPES,
      required: true,
      index: true,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    provider: {
      type: String,
      required: true,
      default: 'deterministic',
    },
    model: {
      type: String,
      required: true,
      default: 'deterministic-heuristics',
    },
    version: {
      type: String,
      required: true,
      default: '1.0.0',
    },
    evaluationVersion: {
      type: Number,
      required: false,
      min: 1,
    },
    contentHash: {
      type: String,
      required: false,
      index: true,
    },
    sourceUpdatedAt: {
      type: Date,
      required: false,
    },
  },
  { timestamps: true }
);

aiAnalysisSchema.index({ studentId: 1, analysisType: 1, createdAt: -1 });

const AIAnalysis = mongoose.models.AIAnalysis
  || mongoose.model('AIAnalysis', aiAnalysisSchema);

export default AIAnalysis;
