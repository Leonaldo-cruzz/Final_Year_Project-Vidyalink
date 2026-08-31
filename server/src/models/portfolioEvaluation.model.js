import mongoose from 'mongoose';

const portfolioEvaluationSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio', required: true, index: true },
    scoringVersion: { type: String, required: true, default: '1.0' },
    portfolioScore: { type: Number, required: true, min: 0, max: 100 },
    category: {
      type: String,
      required: true,
      enum: ['Excellent', 'Very Good', 'Good', 'Average', 'Needs Improvement'],
    },
    breakdown: { type: mongoose.Schema.Types.Mixed, required: true },
    evaluatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

portfolioEvaluationSchema.index({ studentId: 1, createdAt: -1 });
portfolioEvaluationSchema.index({ portfolioId: 1, createdAt: -1 });

const PortfolioEvaluation = mongoose.models.PortfolioEvaluation
  || mongoose.model('PortfolioEvaluation', portfolioEvaluationSchema);

export default PortfolioEvaluation;
