import mongoose from 'mongoose';

const recommendationSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true },
    targetId: { type: String, required: true },
    matchScore: { type: Number, min: 0, max: 100, default: 0 },
    reasons: { type: [String], default: [] },
    matchedSkills: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
    status: { type: String, enum: ['ACTIVE', 'DISMISSED', 'ACCEPTED'], default: 'ACTIVE' },
    algorithmVersion: { type: String, default: '1.0' },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

recommendationSchema.index({ studentId: 1, status: 1, generatedAt: -1 });

const Recommendation = mongoose.models.Recommendation
  || mongoose.model('Recommendation', recommendationSchema);

export default Recommendation;
