import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, MessageSquareWarning, ShieldCheck, XCircle } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { formatDate } from '@/utils/formatters';
import { getVerificationStatus } from '@/services/verificationService';

const STATUS_MAP = {
  VERIFIED: {
    label: 'Verified',
    variant: 'emerald',
    icon: CheckCircle2,
  },
  PENDING: {
    label: 'Pending Verification',
    variant: 'amber',
    icon: Clock,
  },
  REJECTED: {
    label: 'Rejected',
    variant: 'rose',
    icon: XCircle,
  },
  CHANGES_REQUESTED: {
    label: 'Changes Requested',
    variant: 'purple',
    icon: MessageSquareWarning,
  },
};

const VerificationBadge = ({
  verification = null,
  targetType = null,
  targetId = null,
  size = 'sm',
  showDetails = true,
  className = '',
}) => {
  const [data, setData] = useState(verification);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (verification) {
      setData(verification);
      return;
    }

    if (targetType && targetId) {
      let isMounted = true;
      const fetchStatus = async () => {
        try {
          setLoading(true);
          const res = await getVerificationStatus(targetType, targetId);
          if (isMounted) {
            setData(res.data);
          }
        } catch {
          // If no verification record found or error, leave as null
          if (isMounted) setData(null);
        } finally {
          if (isMounted) setLoading(false);
        }
      };

      fetchStatus();
      return () => {
        isMounted = false;
      };
    }
  }, [verification, targetType, targetId]);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 animate-pulse">
        <Clock className="w-3 h-3" /> Checking verification…
      </span>
    );
  }

  if (!data) {
    return null;
  }

  const normalizedStatus = String(data.status || '').toUpperCase().replace(/[\s-]/g, '_');
  const config = STATUS_MAP[normalizedStatus] || STATUS_MAP.PENDING;
  const Icon = config.icon;
  const facultyName = data.facultyId?.fullName || data.facultyName;
  const verifiedDate = data.verifiedAt || data.updatedAt;

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <Badge
        variant={config.variant}
        size={size}
        className="inline-flex items-center gap-1 font-semibold"
      >
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{config.label}</span>
      </Badge>

      {/* For verified items, display Verified by <Faculty Name> on <Date> */}
      {showDetails && normalizedStatus === 'VERIFIED' && (
        <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 flex-shrink-0" />
          <span>
            Verified by {facultyName || 'Faculty'}{' '}
            {verifiedDate ? `on ${formatDate(verifiedDate)}` : ''}
          </span>
        </p>
      )}

      {/* For rejection or changes requested, display remarks if present */}
      {showDetails && (normalizedStatus === 'REJECTED' || normalizedStatus === 'CHANGES_REQUESTED') && data.remarks && (
        <p className="text-[11px] text-slate-400 italic max-w-xs">
          Feedback: {data.remarks}
        </p>
      )}
    </div>
  );
};

export default VerificationBadge;
