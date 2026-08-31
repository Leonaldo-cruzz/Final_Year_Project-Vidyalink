import mongoose from 'mongoose';

const mentorshipSchema = new mongoose.Schema(
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
    topic: {
      type: String,
      required: [true, 'Mentorship topic is required'],
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: [true, 'Request message is required'],
      trim: true,
      maxlength: 2000,
    },
    goals: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    alumniNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      comment: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: null,
      },
      completedAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

mentorshipSchema.index({ student: 1, alumni: 1, status: 1 });

const Mentorship = mongoose.model('Mentorship', mentorshipSchema);

export default Mentorship;
