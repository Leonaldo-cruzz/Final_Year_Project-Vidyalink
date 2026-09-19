export const VERIFICATION_TARGET_FILTERS = [
  { label: 'All', value: 'ALL' },
  { label: 'Profile', value: 'PROFILE' },
  { label: 'Project', value: 'PROJECT' },
  { label: 'Certificate', value: 'CERTIFICATE' },
  { label: 'Resume', value: 'RESUME' },
  { label: 'GitHub', value: 'GITHUB' },
];

export const VERIFICATION_STATUS_FILTERS = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Verified', value: 'VERIFIED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Changes Requested', value: 'CHANGES_REQUESTED' },
];

export const VERIFICATION_SORT_OPTIONS = [
  { label: 'Newest', value: 'NEWEST' },
  { label: 'Oldest', value: 'OLDEST' },
  { label: 'Highest Priority', value: 'HIGHEST_PRIORITY' },
];

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', variant: 'amber', color: 'amber' },
  VERIFIED: { label: 'Verified', variant: 'emerald', color: 'emerald' },
  REJECTED: { label: 'Rejected', variant: 'rose', color: 'rose' },
  CHANGES_REQUESTED: { label: 'Changes Requested', variant: 'purple', color: 'purple' },
};

const PRIORITY_CONFIG = {
  HIGH: { label: 'High', variant: 'rose' },
  MEDIUM: { label: 'Medium', variant: 'amber' },
  NORMAL: { label: 'Normal', variant: 'slate' },
};

export const getStatusConfig = (status) => {
  const normalized = String(status || '').toUpperCase().replace(/[\s-]/g, '_');
  return STATUS_CONFIG[normalized] || {
    label: status || 'Pending',
    variant: 'slate',
    color: 'slate',
  };
};

export const getPriorityConfig = (priority) => PRIORITY_CONFIG[priority] || {
  label: 'Normal',
  variant: 'slate',
};

export const getVerificationTypeLabel = (targetType) => {
  const labels = {
    PROFILE: 'Profile',
    PROJECT: 'Project',
    CERTIFICATE: 'Certificate',
    RESUME: 'Resume',
    GITHUB: 'GitHub',
  };
  return labels[targetType] || targetType;
};

export const formatReviewTime = (minutes = 0) => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};
