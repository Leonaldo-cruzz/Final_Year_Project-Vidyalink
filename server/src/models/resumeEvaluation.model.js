import mongoose from 'mongoose';

const resumeEvaluationSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', required: true, index: true },
    portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio', default: null, index: true },
    atsScore: { type: Number, required: true, min: 0, max: 100 },
    category: {
      type: String,
      required: true,
      enum: ['Excellent', 'Very Good', 'Good', 'Average', 'Needs Improvement'],
    },
    breakdown: { type: mongoose.Schema.Types.Mixed, required: true },
    matchedSkills: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    missingKeywords: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },
    scoringVersion: { type: String, required: true, default: '1.0' },
    evaluatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

resumeEvaluationSchema.index({ studentId: 1, createdAt: -1 });
resumeEvaluationSchema.index({ resumeId: 1, createdAt: -1 });

const ResumeEvaluation = mongoose.models.ResumeEvaluation
  || mongoose.model('ResumeEvaluation', resumeEvaluationSchema);

export default ResumeEvaluation;
