import mongoose from 'mongoose';

const industryReadinessEvaluationSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true, immutable: true },
    portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio', required: true, index: true, immutable: true },
    industryReadinessScore: { type: Number, required: true, min: 0, max: 100 },
    category: {
      type: String,
      required: true,
      enum: ['Highly Industry Ready', 'Industry Ready', 'Progressing', 'Developing', 'Needs Development'],
    },
    breakdown: { type: mongoose.Schema.Types.Mixed, required: true },
    strengths: { type: [String], default: [] },
    gaps: { type: [String], default: [] },
    topRecommendations: { type: [mongoose.Schema.Types.Mixed], default: [] },
    scoringVersion: { type: String, required: true, default: '1.0', immutable: true },
    portfolioEvaluationVersion: { type: String, default: null },
    atsEvaluationVersion: { type: String, default: null },
    githubAnalyticsVersion: { type: String, default: null },
    skillProfileVersion: { type: String, default: null },
    skillGapAnalysisVersion: { type: String, default: null },
    generatedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

industryReadinessEvaluationSchema.index({ studentId: 1, portfolioId: 1, generatedAt: -1 });

const IndustryReadinessEvaluation = mongoose.models.IndustryReadinessEvaluation
  || mongoose.model('IndustryReadinessEvaluation', industryReadinessEvaluationSchema);

export default IndustryReadinessEvaluation;

