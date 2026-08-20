import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Award,
  Briefcase,
  UserCheck,
  Bell,
  Clock,
  Trash2,
  Check,
  Sparkles,
} from 'lucide-react';
import { ROUTES } from '@/constants';

/**
 * Returns icon, color, and border styling corresponding to the notification type.
 */
const getTypeConfig = (type) => {
  switch (type) {
    case 'VERIFICATION_APPROVED':
      return {
        icon: CheckCircle2,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
      };
    case 'VERIFICATION_REJECTED':
      return {
        icon: XCircle,
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
      };
    case 'CHANGES_REQUESTED':
    case 'VERIFICATION_SUBMITTED':
      return {
        icon: AlertCircle,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
      };
    case 'SHORTLISTED':
      return {
        icon: Sparkles,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
      };
    case 'INTERVIEW_SCHEDULED':
    case 'INTERVIEW_RESCHEDULED':
    case 'INTERVIEW_COMPLETED':
      return {
        icon: Calendar,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
      };
    case 'INTERVIEW_CANCELLED':
      return {
        icon: Calendar,
        color: 'text-rose-400',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20',
      };
    case 'MENTORSHIP_REQUEST':
    case 'MENTORSHIP_ACCEPTED':
    case 'MENTORSHIP_DECLINED':
    case 'MENTORSHIP_COMPLETED':
      return {
        icon: UserCheck,
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/20',
      };
    case 'SKILL_ENDORSEMENT':
      return {
        icon: Award,
        color: 'text-amber-300',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
      };
    case 'REFERRAL_CREATED':
    case 'REFERRAL_UPDATED':
      return {
        icon: Briefcase,
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/20',
      };
    case 'PORTFOLIO_UPDATED':
      return {
        icon: Award,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
      };
    default:
      return {
        icon: Bell,
        color: 'text-slate-400',
        bg: 'bg-slate-800/50',
        border: 'border-slate-700/50',
      };
  }
};

/**
 * Clean relative time formatter.
 */
const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/**
 * Determine navigation target based on entity and notification type.
 */
const getEntityRoute = (notification) => {
  const { entityType, entityId, type } = notification;

  if (entityType === 'Certificate') {
    return ROUTES.CERTIFICATES || '/certificates';
  }
  if (entityType === 'Portfolio') {
    return ROUTES.PORTFOLIO || '/portfolio/me';
  }
  if (entityType === 'Application') {
    return ROUTES.PROJECTS || '/projects';
  }
  if (entityType === 'Project' && entityId) {
    return `/projects/${entityId}`;
  }
  if (entityType === 'Workspace' && entityId) {
    return `/workspace/${entityId}`;
  }

  // Fallback heuristics by type
  if (type?.startsWith('VERIFICATION')) return ROUTES.CERTIFICATES || '/certificates';
  if (type?.startsWith('INTERVIEW') || type === 'SHORTLISTED') return ROUTES.PROJECTS || '/projects';
  if (type?.startsWith('MENTORSHIP') || type?.startsWith('REFERRAL')) return ROUTES.PROFILE || '/profile';

  return null;
};

const NotificationItem = ({
  notification,
  onMarkRead,
  onDelete,
  onCloseDropdown,
  compact = false,
}) => {
  const navigate = useNavigate();
  const { icon: Icon, color, bg, border } = getTypeConfig(notification.type);

  const handleClick = (e) => {
    // If clicking action buttons, do not trigger item navigation
    if (e.target.closest('button')) return;

    if (!notification.isRead && onMarkRead) {
      onMarkRead(notification._id);
    }

    const route = getEntityRoute(notification);
    if (route) {
      navigate(route);
      if (onCloseDropdown) onCloseDropdown();
    }
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick(e);
        }
      }}
      className={`group relative flex items-start gap-3.5 p-3.5 transition-all text-left cursor-pointer select-none rounded-xl ${
        notification.isRead
          ? 'bg-transparent hover:bg-slate-900/60 dark:hover:bg-slate-900/60 opacity-80 hover:opacity-100'
          : 'bg-slate-900/80 dark:bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 shadow-sm'
      }`}
    >
      {/* Unread indicator dot */}
      {!notification.isRead && (
        <span
          className="absolute top-4 right-3.5 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-500/20"
          title="Unread"
        />
      )}

      {/* Type Icon Badge */}
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${bg} ${color} border ${border} mt-0.5`}
      >
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-sm font-semibold truncate ${
              notification.isRead ? 'text-slate-300' : 'text-white'
            }`}
          >
            {notification.title}
          </p>
        </div>

        <p
          className={`text-xs mt-1 line-clamp-2 leading-relaxed ${
            notification.isRead ? 'text-slate-400' : 'text-slate-300'
          }`}
        >
          {notification.message}
        </p>

        <div className="flex items-center justify-between mt-2 pt-1">
          <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(notification.createdAt)}
          </span>

          {/* Quick action buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!notification.isRead && onMarkRead && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead(notification._id);
                }}
                className="p-1 rounded-md text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                title="Mark as read"
                aria-label="Mark as read"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification._id);
                }}
                className="p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Delete notification"
                aria-label="Delete notification"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
