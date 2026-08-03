import mongoose from 'mongoose';

const projectSequenceSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    sequence: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    versionKey: false,
  }
);

const projectSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    projectId: {
      type: String,
      unique: true,
      immutable: true,
      sparse: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 5000,
    },
    company: {
      type: String,
      required: true,
      trim: true,
      default: 'VidyaLink Partner',
    },
    domain: {
      type: String,
      required: true,
      trim: true,
      default: 'Software Development',
    },
    requiredSkills: {
      type: [{ type: String, trim: true, maxlength: 50 }],
      default: [],
    },
    techStack: {
      type: [{ type: String, trim: true, maxlength: 50 }],
      default: [],
    },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Intermediate',
    },
    duration: {
      type: String,
      trim: true,
      default: '1 Month',
    },
    stipend: {
      type: Number,
      default: 0,
      min: 0,
    },
    mode: {
      type: String,
      enum: ['Remote', 'Hybrid', 'In-office'],
      default: 'Remote',
    },
    deadline: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'completed', 'closed'],
      default: 'open',
      index: true,
    },
    selectedStudent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    githubUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
    liveUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
    verificationStatus: {
      type: String,
      enum: ['Pending', 'Verified', 'Rejected'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  }
);

projectSchema.pre('save', function (next) {
  if (!this.user && this.createdBy) {
    this.user = this.createdBy;
  }
  if (!this.createdBy && this.user) {
    this.createdBy = this.user;
  }
  if (!this.requiredSkills || this.requiredSkills.length === 0) {
    if (this.techStack && this.techStack.length > 0) {
      this.requiredSkills = this.techStack;
    }
  }
  next();
});

projectSchema.index({ createdBy: 1, createdAt: -1 });
projectSchema.index({ status: 1, domain: 1, difficulty: 1, mode: 1 });

const ProjectSequence = mongoose.model('ProjectSequence', projectSequenceSchema);
const Project = mongoose.model('Project', projectSchema);

export const generateProjectId = async () => {
  const year = new Date().getUTCFullYear();
  const counter = await ProjectSequence.findByIdAndUpdate(
    `project:${year}`,
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return `VLP-${year}-${String(counter.sequence).padStart(6, '0')}`;
};

export default Project;
