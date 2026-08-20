import notificationService from './notification.service.js';
import { NOTIFICATION_TYPE } from '../models/notification.model.js';

class NotificationEventsService {
  /**
   * Safe execution wrapper — ensures notification failures NEVER throw
   * or interrupt the parent business transaction.
   */
  async _safeDispatch(notificationPayload) {
    try {
      return await notificationService.createNotification(notificationPayload);
    } catch (error) {
      // Log failure safely without exposing sensitive tokens or internal trace
      console.error(
        `[NotificationEvent Warning] Failed to dispatch notification '${notificationPayload?.type}' to recipient '${notificationPayload?.recipientId}':`,
        error?.message || error
      );
      return null;
    }
  }

  // ── Verification Events ───────────────────────────────────────────────────

  async notifyVerificationSubmitted({
    facultyId,
    studentId,
    studentName,
    entityType = 'Certificate',
    entityId = null,
    certificateName = 'Certificate',
    metadata = {},
  }) {
    if (!facultyId) return null;
    return this._safeDispatch({
      recipientId: facultyId,
      actorId: studentId,
      type: NOTIFICATION_TYPE.VERIFICATION_SUBMITTED,
      title: 'New Verification Request',
      message: `${studentName || 'A student'} submitted '${certificateName}' for verification.`,
      entityType,
      entityId,
      metadata: { ...metadata, certificateName, studentName },
    });
  }

  async notifyVerificationApproved({
    studentId,
    facultyId,
    facultyName,
    entityType = 'Certificate',
    entityId = null,
    certificateName = 'Certificate',
    metadata = {},
  }) {
    return this._safeDispatch({
      recipientId: studentId,
      actorId: facultyId,
      type: NOTIFICATION_TYPE.VERIFICATION_APPROVED,
      title: 'Verification Approved',
      message: `Your ${certificateName} has been verified and approved${facultyName ? ` by ${facultyName}` : ''}.`,
      entityType,
      entityId,
      metadata: { ...metadata, certificateName },
    });
  }

  async notifyVerificationRejected({
    studentId,
    facultyId,
    facultyName,
    entityType = 'Certificate',
    entityId = null,
    certificateName = 'Certificate',
    reason = '',
    metadata = {},
  }) {
    return this._safeDispatch({
      recipientId: studentId,
      actorId: facultyId,
      type: NOTIFICATION_TYPE.VERIFICATION_REJECTED,
      title: 'Verification Rejected',
      message: `Your ${certificateName} verification was rejected${facultyName ? ` by ${facultyName}` : ''}${reason ? `: ${reason}` : '.'}`,
      entityType,
      entityId,
      metadata: { ...metadata, certificateName, reason, facultyName },
    });
  }

  async notifyChangesRequested({
    studentId,
    facultyId,
    facultyName,
    entityType = 'Certificate',
    entityId = null,
    certificateName = 'Certificate',
    feedback = '',
    metadata = {},
  }) {
    return this._safeDispatch({
      recipientId: studentId,
      actorId: facultyId,
      type: NOTIFICATION_TYPE.CHANGES_REQUESTED,
      title: 'Verification Changes Requested',
      message: `Changes requested on ${certificateName}${facultyName ? ` by ${facultyName}` : ''}${feedback ? `: ${feedback}` : '.'}`,
      entityType,
      entityId,
      metadata: { ...metadata, certificateName, feedback },
    });
  }

  // ── Recruitment & Interview Events ────────────────────────────────────────

  async notifyCandidateShortlisted({
    studentId,
    recruiterId,
    recruiterName,
    projectTitle = 'Opportunity',
    entityId = null,
    metadata = {},
  }) {
    return this._safeDispatch({
      recipientId: studentId,
      actorId: recruiterId,
      type: NOTIFICATION_TYPE.SHORTLISTED,
      title: 'You Have Been Shortlisted!',
      message: `Congratulations! You have been shortlisted for '${projectTitle}'${recruiterName ? ` by ${recruiterName}` : ''}.`,
      entityType: 'Application',
      entityId,
      metadata: { ...metadata, projectTitle },
    });
  }

  async notifyInterviewScheduled({
    studentId,
    recruiterId,
    recruiterName,
    projectTitle = 'Opportunity',
    interviewDate,
    interviewMode,
    entityId = null,
    metadata = {},
  }) {
    const formattedDate = interviewDate ? new Date(interviewDate).toLocaleString() : 'Soon';
    return this._safeDispatch({
      recipientId: studentId,
      actorId: recruiterId,
      type: NOTIFICATION_TYPE.INTERVIEW_SCHEDULED,
      title: 'Interview Scheduled',
      message: `An interview has been scheduled for '${projectTitle}' on ${formattedDate} (${interviewMode || 'Online'})${recruiterName ? ` by ${recruiterName}` : ''}.`,
      entityType: 'Application',
      entityId,
      metadata: { ...metadata, projectTitle, interviewDate, interviewMode, recruiterName },
    });
  }

  async notifyInterviewRescheduled({
    studentId,
    actorId,
    projectTitle = 'Interview',
    newDate,
    entityId = null,
    metadata = {},
  }) {
    const formattedDate = newDate ? new Date(newDate).toLocaleString() : 'an updated time';
    return this._safeDispatch({
      recipientId: studentId,
      actorId,
      type: NOTIFICATION_TYPE.INTERVIEW_RESCHEDULED,
      title: 'Interview Rescheduled',
      message: `Your interview for '${projectTitle}' has been rescheduled to ${formattedDate}.`,
      entityType: 'Interview',
      entityId,
      metadata: { ...metadata, projectTitle, newDate },
    });
  }

  async notifyInterviewCancelled({
    recipientId,
    actorId,
    title = 'Interview',
    reason = '',
    entityId = null,
    metadata = {},
  }) {
    return this._safeDispatch({
      recipientId,
      actorId,
      type: NOTIFICATION_TYPE.INTERVIEW_CANCELLED,
      title: 'Interview Cancelled',
      message: `The interview for '${title}' has been cancelled${reason ? `: ${reason}` : '.'}`,
      entityType: 'Interview',
      entityId,
      metadata: { ...metadata, title, reason },
    });
  }

  async notifyInterviewCompleted({
    studentId,
    actorId,
    title = 'Interview',
    status = 'Selected',
    entityId = null,
    metadata = {},
  }) {
    return this._safeDispatch({
      recipientId: studentId,
      actorId,
      type: NOTIFICATION_TYPE.INTERVIEW_COMPLETED,
      title: status === 'Selected' ? 'Candidate Selected!' : 'Interview Process Completed',
      message: status === 'Selected'
        ? `Congratulations! You were selected for '${title}'.`
        : `Your interview evaluation for '${title}' is complete.`,
      entityType: 'Application',
      entityId,
      metadata: { ...metadata, title, status },
    });
  }

  // ── Alumni & Mentorship Events ────────────────────────────────────────────

  async notifyMentorshipRequest({
    alumniId,
    studentId,
    studentName,
    topic,
    entityId = null,
    metadata = {},
  }) {
    return this._safeDispatch({
      recipientId: alumniId,
      actorId: studentId,
      type: NOTIFICATION_TYPE.MENTORSHIP_REQUEST,
      title: 'New Mentorship Request',
      message: `${studentName || 'A student'} requested mentorship regarding '${topic || 'Career Guidance'}'.`,
      entityType: 'MentorshipRequest',
      entityId,
      metadata: { ...metadata, topic, studentName },
    });
  }

  async notifyMentorshipAccepted({
    studentId,
    alumniId,
    alumniName,
    topic,
    entityId = null,
    metadata = {},
  }) {
    return this._safeDispatch({
      recipientId: studentId,
      actorId: alumniId,
      type: NOTIFICATION_TYPE.MENTORSHIP_ACCEPTED,
      title: 'Mentorship Request Accepted',
      message: `${alumniName || 'Your mentor'} accepted your mentorship request for '${topic || 'guidance'}'.`,
      entityType: 'MentorshipRequest',
      entityId,
      metadata: { ...metadata, topic, alumniName },
    });
  }

  async notifyMentorshipDeclined({
    studentId,
    alumniId,
    alumniName,
    topic,
    responseMessage,
    entityId = null,
    metadata = {},
  }) {
    return this._safeDispatch({
      recipientId: studentId,
      actorId: alumniId,
      type: NOTIFICATION_TYPE.MENTORSHIP_DECLINED,
      title: 'Mentorship Request Declined',
      message: `${alumniName || 'The alumni'} was unable to accept your mentorship request${responseMessage ? `: ${responseMessage}` : '.'}`,
      entityType: 'MentorshipRequest',
      entityId,
      metadata: { ...metadata, topic, responseMessage },
    });
  }

  async notifyMentorshipCompleted({
    studentId,
    alumniId,
    alumniName,
    topic,
    entityId = null,
    metadata = {},
  }) {
    return this._safeDispatch({
      recipientId: studentId,
      actorId: alumniId,
      type: NOTIFICATION_TYPE.MENTORSHIP_COMPLETED,
      title: 'Mentorship Completed',
      message: `Your mentorship session for '${topic || 'Career Guidance'}' with ${alumniName || 'alumni'} has been marked completed.`,
      entityType: 'MentorshipRequest',
      entityId,
      metadata: { ...metadata, topic },
    });
  }

  async notifySkillEndorsement({
    studentId,
    alumniId,
    alumniName,
    skill,
    entityId = null,
    metadata = {},
  }) {
    return this._safeDispatch({
      recipientId: studentId,
      actorId: alumniId,
      type: NOTIFICATION_TYPE.SKILL_ENDORSEMENT,
      title: 'Skill Endorsement Received',
      message: `${alumniName || 'An alumni'} endorsed your skill in '${skill}'.`,
      entityType: 'SkillEndorsement',
      entityId,
      metadata: { ...metadata, skill },
    });
  }

  async notifyReferralCreated({
    studentId,
    alumniId,
    alumniName,
    companyName,
    jobTitle,
    entityId = null,
    metadata = {},
  }) {
    return this._safeDispatch({
      recipientId: studentId,
      actorId: alumniId,
      type: NOTIFICATION_TYPE.REFERRAL_CREATED,
      title: 'New Job Referral Created',
      message: `${alumniName || 'An alumni'} created a referral for you as '${jobTitle}' at ${companyName}.`,
      entityType: 'Referral',
      entityId,
      metadata: { ...metadata, companyName, jobTitle },
    });
  }

  async notifyReferralUpdated({
    studentId,
    alumniId,
    alumniName,
    companyName,
    jobTitle,
    status,
    entityId = null,
    metadata = {},
  }) {
    return this._safeDispatch({
      recipientId: studentId,
      actorId: alumniId,
      type: NOTIFICATION_TYPE.REFERRAL_UPDATED,
      title: 'Referral Status Updated',
      message: `Your referral for '${jobTitle}' at ${companyName} is now '${status}'${alumniName ? ` (referred by ${alumniName})` : ''}.`,
      entityType: 'Referral',
      entityId,
      metadata: { ...metadata, companyName, jobTitle, status, alumniName },
    });
  }

  // ── Portfolio & System Events ─────────────────────────────────────────────

  async notifyPortfolioUpdated({
    studentId,
    entityId = null,
    metadata = {},
  }) {
    return this._safeDispatch({
      recipientId: studentId,
      type: NOTIFICATION_TYPE.PORTFOLIO_UPDATED,
      title: 'Portfolio Updated',
      message: 'Your verified student portfolio has been updated.',
      entityType: 'Portfolio',
      entityId,
      metadata,
    });
  }

  async notifySystem({
    recipientId,
    title = 'System Notification',
    message,
    metadata = {},
  }) {
    return this._safeDispatch({
      recipientId,
      type: NOTIFICATION_TYPE.SYSTEM,
      title,
      message,
      metadata,
    });
  }
}

export default new NotificationEventsService();
