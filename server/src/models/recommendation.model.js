import mongoose from 'mongoose';

export const RECOMMENDATION_TYPES = Object.freeze([
  'ALUMNI_MENTOR',
  'RECRUITER_OPPORTUNITY',
  'SKILL_IMPROVEMENT',
  'PROJECT_IMPROVEMENT',
  'RESUME_IMPROVEMENT',
]);

export const RECOMMENDATION_PRIORITIES = Object.freeze(['LOW', 'MEDIUM', 'HIGH']);
export const RECOMMENDATION_STATUSES = Object.freeze(['ACTIVE', 'DISMISSED', 'ACCEPTED']);

const stringList = (fieldName) => ({
  type: [{ type: String, trim: true, maxlength: 200 }],
  default: [],
  validate: {
    validator: (values) => Array.isArray(values) && values.length <= 30,
    message: `${fieldName} cannot exceed 30 entries`,
  },
});

const recommendationSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    type: {
      type: String,
      enum: RECOMMENDATION_TYPES,
      required: true,
      immutable: true,
    },
    // A target can be a MongoDB id (alumni/opportunity) or a stable rule id,
    // for example `project:documentation`.
    targetId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      immutable: true,
    },
    matchScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    reasons: {
      ...stringList('Reasons'),
      validate: {
        validator: (values) => Array.isArray(values) && values.length > 0 && values.length <= 30,
        message: 'At least one reason is required and no more than 30 reasons are allowed',
      },
    },
    matchedSkills: stringList('Matched skills'),
    missingSkills: stringList('Missing skills'),
    priority: {
      type: String,
      enum: RECOMMENDATION_PRIORITIES,
      required: true,
    },
    status: {
      type: String,
      enum: RECOMMENDATION_STATUSES,
      default: 'ACTIVE',
      required: true,
    },
    algorithmVersion: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    generatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true }
);

recommendationSchema.index({ studentId: 1, status: 1, matchScore: -1, generatedAt: -1 });
recommendationSchema.index({ studentId: 1, type: 1, status: 1, generatedAt: -1 });
recommendationSchema.index(
  { studentId: 1, type: 1, targetId: 1, algorithmVersion: 1 },
  { unique: true, partialFilterExpression: { status: 'ACTIVE' } }
);

const Recommendation = mongoose.models.Recommendation
  || mongoose.model('Recommendation', recommendationSchema);

export default Recommendation;
