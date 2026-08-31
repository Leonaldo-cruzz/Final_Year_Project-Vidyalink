import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema(
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
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: 150,
    },
    jobTitle: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: 150,
    },
    jobUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: '',
    },
    message: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REFERRED', 'REJECTED', 'CLOSED'],
      default: 'SUBMITTED',
      index: true,
    },
    internalNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

referralSchema.index({ student: 1, alumni: 1, status: 1 });

const Referral = mongoose.model('Referral', referralSchema);

export default Referral;
