import mongoose from 'mongoose';

const endorsementSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
      index: true,
    },
    alumni: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Alumni is required'],
      index: true,
    },
    skill: {
      type: String,
      required: [true, 'Skill name is required'],
      trim: true,
      maxlength: 100,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'REVOKED'],
      default: 'ACTIVE',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate active endorsement from the same alumni for the same student and skill
endorsementSchema.index({ student: 1, alumni: 1, skill: 1 }, { unique: true });

const Endorsement = mongoose.model('Endorsement', endorsementSchema);

export default Endorsement;
