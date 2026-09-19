import mongoose from 'mongoose';

export const RESUME_STATUSES = Object.freeze(['UPLOADED', 'GENERATED', 'STALE']);
export const RESUME_SOURCES  = Object.freeze(['uploaded', 'generated']);

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    // ── File metadata (both upload and generate paths populate these) ──────────
    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },
    storedFileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
      default: 'application/pdf',
    },
    fileType: {
      type: String,
      enum: ['pdf', 'docx', 'other'],
      default: 'pdf',
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    // ── Document Intelligence & Parsing ────────────────────────────────────────
    /** Extracted plain text from the document buffer */
    rawText: {
      type: String,
      default: '',
    },
    /** Parsed structured data with source attribution */
    parsedData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    /** SHA-256 of the binary file buffer for deduplication */
    contentHash: {
      type: String,
      trim: true,
      default: null,
    },
    /** Incrementing version for tracking resume replacements */
    version: {
      type: Number,
      default: 1,
    },
    /** Version of the parser used */
    parserVersion: {
      type: String,
      default: '1.0.0',
    },
    /** When parsing was completed */
    parsedAt: {
      type: Date,
      default: null,
    },
    /** Status of the parsing pipeline */
    parsingStatus: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'IMAGE_ONLY', 'EMPTY', 'UNREADABLE', 'NOT_PARSED'],
      default: 'NOT_PARSED',
    },
    /** Error message if parsing failed */
    parsingError: {
      type: String,
      default: null,
    },
    // ── Generation tracking ────────────────────────────────────────────────────
    /** UPLOADED: student uploaded manually.
     *  GENERATED: produced by the resume builder from profile data.
     *  STALE: generated, but source data has changed since last generation. */
    status: {
      type: String,
      enum: RESUME_STATUSES,
      default: 'UPLOADED',
    },
    /** 'uploaded' | 'generated' */
    resumeSource: {
      type: String,
      enum: RESUME_SOURCES,
      default: 'uploaded',
    },
    /** When the last generation was performed. Null for upload-only records. */
    generatedAt: {
      type: Date,
      default: null,
    },
    /** SHA-256 of the canonical source data used during the last generation.
     *  Used to detect staleness when profile/skills/projects change. */
    sourceSnapshot: {
      type: String,
      trim: true,
      default: null,
    },
    /** Semantic version of the resume template used. */
    generationVersion: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

resumeSchema.pre('save', function syncStudentId(next) {
  if (this.userId && !this.studentId) {
    this.studentId = this.userId;
  } else if (this.studentId && !this.userId) {
    this.userId = this.studentId;
  }
  if (this.mimeType?.includes('wordprocessingml') || this.originalFileName?.toLowerCase().endsWith('.docx')) {
    this.fileType = 'docx';
  } else if (this.mimeType?.includes('pdf') || this.originalFileName?.toLowerCase().endsWith('.pdf')) {
    this.fileType = 'pdf';
  }
  next();
});

const Resume = mongoose.models.Resume || mongoose.model('Resume', resumeSchema);

export default Resume;

