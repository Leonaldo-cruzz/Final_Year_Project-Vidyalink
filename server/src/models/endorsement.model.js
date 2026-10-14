import mongoose from 'mongoose';

const endorsementSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    alumni: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    skill: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    canonicalSkill: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 100,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'revoked'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique index to prevent duplicate endorsements for the same student and skill by the same alumni member
endorsementSchema.index({ student: 1, alumni: 1, canonicalSkill: 1 }, { unique: true });
endorsementSchema.index({ student: 1, status: 1, createdAt: -1 });

endorsementSchema.pre('validate', function (next) {
  if (this.skill && !this.canonicalSkill) {
    this.canonicalSkill = this.skill.trim().toLowerCase();
  }
  next();
});

const Endorsement = mongoose.models.Endorsement || mongoose.model('Endorsement', endorsementSchema);

export default Endorsement;
