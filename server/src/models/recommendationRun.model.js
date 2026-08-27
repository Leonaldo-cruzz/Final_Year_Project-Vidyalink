import mongoose from 'mongoose';

export const RECOMMENDATION_RUN_SCOPES = Object.freeze([
  'ALUMNI',
  'RECRUITERS',
  'IMPROVEMENTS',
]);

const recommendationRunSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    scope: {
      type: String,
      enum: RECOMMENDATION_RUN_SCOPES,
      required: true,
      immutable: true,
    },
    algorithmVersion: {
      type: String,
      required: true,
      immutable: true,
    },
    generatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true }
);

recommendationRunSchema.index({ studentId: 1, scope: 1, algorithmVersion: 1 }, { unique: true });
recommendationRunSchema.index({ generatedAt: 1 });

const RecommendationRun = mongoose.models.RecommendationRun
  || mongoose.model('RecommendationRun', recommendationRunSchema);

export default RecommendationRun;
