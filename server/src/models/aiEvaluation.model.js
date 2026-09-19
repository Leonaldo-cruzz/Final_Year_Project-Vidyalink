import mongoose from 'mongoose';

export const AI_EVALUATION_CATEGORIES = [
  'Excellent',
  'Very Good',
  'Good',
  'Average',
  'Needs Improvement',
];

export const AI_EVALUATION_STATUSES = [
  'NOT_EVALUATED',
  'ELIGIBLE',
  'EVALUATING',
  'COMPLETED',
  'PARTIAL',
  'INSUFFICIENT_EVIDENCE',
  'FAILED',
  'STALE',
];

const aiEvaluationSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    overallScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    category: {
      type: String,
      enum: AI_EVALUATION_CATEGORIES,
      required: true,
    },
    componentScores: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    weightedBreakdown: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    evidence: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    strengths: {
      type: [String],
      default: [],
    },
    improvements: {
      type: [String],
      default: [],
    },
    dataCompleteness: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    evidenceStatus: {
      type: String,
      default: 'sufficient',
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
    evaluationStatus: {
      type: String,
      enum: AI_EVALUATION_STATUSES,
      default: 'COMPLETED',
      index: true,
    },
    status: {
      type: String,
      enum: AI_EVALUATION_STATUSES,
      default: 'COMPLETED',
      index: true,
    },
    portfolio: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    projectEvaluations: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    skills: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    skillGap: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    github: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ats: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    readiness: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    recommendations: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    evaluationVersion: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    contentHash: {
      type: String,
      required: false,
      index: true,
    },
    dedupeKey: {
      type: String,
      required: false,
    },
    sourceUpdatedAt: {
      type: Date,
      required: false,
    },
    pipelineStatus: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

aiEvaluationSchema.pre('save', function syncStatus(next) {
  if (this.isModified('evaluationStatus') && !this.isModified('status')) {
    this.status = this.evaluationStatus;
  } else if (this.isModified('status') && !this.isModified('evaluationStatus')) {
    this.evaluationStatus = this.status;
  }
  next();
});

aiEvaluationSchema.index({ portfolioId: 1, createdAt: -1 });
aiEvaluationSchema.index({ studentId: 1, createdAt: -1 });
aiEvaluationSchema.index({ portfolioId: 1, evaluationVersion: -1 });
aiEvaluationSchema.index(
  { portfolioId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } },
);

const AIEvaluation = mongoose.models.AIEvaluation
  || mongoose.model('AIEvaluation', aiEvaluationSchema);

export default AIEvaluation;
