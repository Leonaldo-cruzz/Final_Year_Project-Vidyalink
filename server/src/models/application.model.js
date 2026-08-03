import mongoose from 'mongoose';

const APPLICATION_STATUSES = [
  'Applied',
  'Under Review',
  'Shortlisted',
  'Interview Scheduled',
  'Selected',
  'Rejected',
  'Withdrawn',
];

const applicationSchema = new mongoose.Schema(
  {
    projectOpportunityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    coverLetter: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 3000,
    },
    pitch: {
      type: String,
      trim: true,
    },
    resumeSnapshot: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
    resumeUrl: {
      type: String,
      trim: true,
    },
    githubSnapshot: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
    githubUrl: {
      type: String,
      trim: true,
    },
    portfolioSnapshot: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
    skills: {
      type: [{ type: String, trim: true, maxlength: 50 }],
      default: [],
    },
    status: {
      type: String,
      enum: APPLICATION_STATUSES,
      default: 'Applied',
      index: true,
    },
    recruiterNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    feedback: {
      type: String,
      trim: true,
    },
    interviewDate: {
      type: Date,
      default: null,
    },
    interviewMode: {
      type: String,
      enum: ['Online', 'In-person', null],
      default: null,
    },
    selectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

applicationSchema.pre('save', function (next) {
  if (!this.project && this.projectOpportunityId) {
    this.project = this.projectOpportunityId;
  }
  if (!this.projectOpportunityId && this.project) {
    this.projectOpportunityId = this.project;
  }

  if (!this.student && this.studentId) {
    this.student = this.studentId;
  }
  if (!this.studentId && this.student) {
    this.studentId = this.student;
  }

  if (!this.coverLetter && this.pitch) {
    this.coverLetter = this.pitch;
  }
  if (!this.pitch && this.coverLetter) {
    this.pitch = this.coverLetter;
  }

  if (!this.resumeSnapshot && this.resumeUrl) {
    this.resumeSnapshot = this.resumeUrl;
  }
  if (!this.resumeUrl && this.resumeSnapshot) {
    this.resumeUrl = this.resumeSnapshot;
  }

  if (!this.githubSnapshot && this.githubUrl) {
    this.githubSnapshot = this.githubUrl;
  }
  if (!this.githubUrl && this.githubSnapshot) {
    this.githubUrl = this.githubSnapshot;
  }

  if (!this.recruiterNotes && this.feedback) {
    this.recruiterNotes = this.feedback;
  }
  if (!this.feedback && this.recruiterNotes) {
    this.feedback = this.recruiterNotes;
  }

  next();
});

// Prevent duplicate applications by same student on same project
applicationSchema.index({ projectOpportunityId: 1, studentId: 1 }, { unique: true });

const Application = mongoose.model('Application', applicationSchema);

export default Application;
