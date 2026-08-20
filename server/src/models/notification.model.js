import mongoose from 'mongoose';

// ─── Notification Types ───────────────────────────────────────────────────────

export const NOTIFICATION_TYPE = Object.freeze({
  // Verification
  VERIFICATION_SUBMITTED: 'VERIFICATION_SUBMITTED',
  VERIFICATION_APPROVED: 'VERIFICATION_APPROVED',
  VERIFICATION_REJECTED: 'VERIFICATION_REJECTED',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',

  // Recruitment & Interviews
  SHORTLISTED: 'SHORTLISTED',
  INTERVIEW_SCHEDULED: 'INTERVIEW_SCHEDULED',
  INTERVIEW_RESCHEDULED: 'INTERVIEW_RESCHEDULED',
  INTERVIEW_CANCELLED: 'INTERVIEW_CANCELLED',
  INTERVIEW_COMPLETED: 'INTERVIEW_COMPLETED',

  // Mentorship
  MENTORSHIP_REQUEST: 'MENTORSHIP_REQUEST',
  MENTORSHIP_ACCEPTED: 'MENTORSHIP_ACCEPTED',
  MENTORSHIP_DECLINED: 'MENTORSHIP_DECLINED',
  MENTORSHIP_COMPLETED: 'MENTORSHIP_COMPLETED',

  // Endorsements & Referrals
  SKILL_ENDORSEMENT: 'SKILL_ENDORSEMENT',
  REFERRAL_CREATED: 'REFERRAL_CREATED',
  REFERRAL_UPDATED: 'REFERRAL_UPDATED',

  // Portfolio & System
  PORTFOLIO_UPDATED: 'PORTFOLIO_UPDATED',
  SYSTEM: 'SYSTEM',
});

const TYPE_VALUES = Object.values(NOTIFICATION_TYPE);

// ─── Schema Definition ────────────────────────────────────────────────────────

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient ID is required'],
      index: true,
    },

    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: {
        values: TYPE_VALUES,
        message: `Type must be one of: ${TYPE_VALUES.join(', ')}`,
      },
    },

    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [200, 'Title must not exceed 200 characters'],
    },

    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      minlength: [2, 'Message must be at least 2 characters'],
      maxlength: [2000, 'Message must not exceed 2000 characters'],
    },

    entityType: {
      type: String,
      trim: true,
      maxlength: [100, 'Entity type must not exceed 100 characters'],
      default: null,
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Compound index for querying user notifications sorted by newest first
notificationSchema.index({ recipientId: 1, createdAt: -1 });

// Compound index for unread count and unread filtering
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

// Index for filtering by notification type
notificationSchema.index({ type: 1 });

// Index for entity lookups
notificationSchema.index({ entityType: 1, entityId: 1 });

// ─── Export ───────────────────────────────────────────────────────────────────

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
