import React from 'react';
import {
  ShieldCheck, Clock, AlertTriangle, XCircle, CheckCircle2,
  FolderPlus, ArrowRight, RefreshCw, MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { ROUTES } from '@/constants';

/**
 * Student-facing verification status component for the dashboard.
 * Purely data-driven from actual database verification state.
 */
const PortfolioVerificationCard = ({
  status = 'NOT_SUBMITTED', // NOT_SUBMITTED | PENDING | CHANGES_REQUESTED | REJECTED | VERIFIED
  verificationRecord = null,
  hasProjects = false,
  isEligible = false,
  onOpenSubmitModal,
}) => {
  const navigate = useNavigate();

  // Normalize status
  const normalizedStatus = String(status || 'NOT_SUBMITTED').toUpperCase().replace(/[\s-]/g, '_');

  const getStatusConfig = () => {
    switch (normalizedStatus) {
      case 'VERIFIED':
        return {
          title: 'Verified',
          badgeVariant: 'emerald',
          icon: CheckCircle2,
          iconColor: 'text-emerald-400',
          borderColor: 'border-emerald-500/30',
          bgColor: 'bg-emerald-500/5',
          description: 'Your portfolio is faculty verified. Official credential record is recorded in the institutional registry.',
          ctaLabel: 'View Verified Portfolio',
          ctaVariant: 'primary',
          ctaIcon: ShieldCheck,
          ctaAction: () => navigate('/portfolio'),
        };
      case 'PENDING':
        return {
          title: 'Under Faculty Review',
          badgeVariant: 'amber',
          icon: Clock,
          iconColor: 'text-amber-400',
          borderColor: 'border-amber-500/30',
          bgColor: 'bg-amber-500/5',
          description: 'Your submission is with faculty for review. You will be notified once reviewed.',
          ctaLabel: 'Verification Pending',
          ctaVariant: 'secondary',
          ctaIcon: Clock,
          ctaDisabled: true,
          ctaAction: () => {},
        };
      case 'CHANGES_REQUESTED':
        return {
          title: 'Changes Requested',
          badgeVariant: 'purple',
          icon: AlertTriangle,
          iconColor: 'text-purple-400',
          borderColor: 'border-purple-500/30',
          bgColor: 'bg-purple-500/5',
          description: 'Faculty has reviewed your submission and requested adjustments before endorsement.',
          ctaLabel: 'Update & Resubmit',
          ctaVariant: 'primary',
          ctaIcon: RefreshCw,
          ctaAction: onOpenSubmitModal || (() => navigate(ROUTES.PROJECTS)),
        };
      case 'REJECTED':
        return {
          title: 'Verification Rejected',
          badgeVariant: 'rose',
          icon: XCircle,
          iconColor: 'text-rose-400',
          borderColor: 'border-rose-500/30',
          bgColor: 'bg-rose-500/5',
          description: 'Your verification request was rejected by faculty. Review remarks and address feedback before resubmitting.',
          ctaLabel: 'Resubmit for Verification',
          ctaVariant: 'secondary',
          ctaIcon: RefreshCw,
          ctaAction: onOpenSubmitModal || (() => navigate(ROUTES.PROJECTS)),
        };
      case 'NOT_SUBMITTED':
      default:
        if (!hasProjects) {
          return {
            title: 'Not submitted',
            badgeVariant: 'slate',
            icon: FolderPlus,
            iconColor: 'text-slate-400',
            borderColor: 'border-slate-800',
            bgColor: 'bg-slate-900/50',
            description: 'Your portfolio has not been submitted for faculty verification yet. Add a project to get started.',
            ctaLabel: 'Add Project',
            ctaVariant: 'primary',
            ctaIcon: FolderPlus,
            ctaAction: () => navigate('/projects/new'),
          };
        }
        if (!isEligible) {
          return {
            title: 'Not submitted',
            badgeVariant: 'slate',
            icon: AlertTriangle,
            iconColor: 'text-amber-400',
            borderColor: 'border-slate-800',
            bgColor: 'bg-slate-900/50',
            description: 'Complete your project information before submitting for faculty review.',
            ctaLabel: 'Complete Portfolio',
            ctaVariant: 'secondary',
            ctaIcon: ArrowRight,
            ctaAction: () => navigate(ROUTES.PROJECTS),
          };
        }
        return {
          title: 'Not submitted',
          badgeVariant: 'slate',
          icon: ShieldCheck,
          iconColor: 'text-orange-400',
          borderColor: 'border-slate-800',
          bgColor: 'bg-slate-900/50',
          description: 'Your portfolio has not been submitted for faculty verification yet.',
          ctaLabel: 'Submit for Verification',
          ctaVariant: 'primary',
          ctaIcon: ShieldCheck,
          ctaAction: onOpenSubmitModal || (() => navigate(ROUTES.PROJECTS)),
        };
    }
  };

  const cfg = getStatusConfig();
  const Icon = cfg.icon;

  const timestamp = verificationRecord?.verifiedAt || verificationRecord?.updatedAt || verificationRecord?.createdAt;
  const remarks = verificationRecord?.remarks;
  const facultyName = verificationRecord?.facultyId?.fullName;

  return (
    <div className={`rounded-xl border ${cfg.borderColor} ${cfg.bgColor} p-5 sm:p-6 transition-all shadow-md space-y-4`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-center shrink-0">
            <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
              Portfolio Verification
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <h3 className="text-base font-bold text-white">
                Status: <span className="font-extrabold">{cfg.title}</span>
              </h3>
              <Badge variant={cfg.badgeVariant} size="sm">
                {cfg.title}
              </Badge>
            </div>
          </div>
        </div>

        <Button
          size="sm"
          variant={cfg.ctaVariant}
          leftIcon={cfg.ctaIcon}
          disabled={cfg.ctaDisabled}
          onClick={cfg.ctaAction}
        >
          {cfg.ctaLabel}
        </Button>
      </div>

      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
        {cfg.description}
      </p>

      {/* Faculty Remarks if present */}
      {remarks && (normalizedStatus === 'CHANGES_REQUESTED' || normalizedStatus === 'REJECTED' || normalizedStatus === 'VERIFIED') && (
        <div className="rounded-lg bg-slate-950/80 border border-slate-800/90 p-3.5 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
            <span>Faculty Remarks {facultyName ? `by ${facultyName}` : ''}:</span>
          </div>
          <p className="text-xs text-slate-400 italic pl-5">
            "{remarks}"
          </p>
        </div>
      )}

      {/* Timestamp info */}
      {timestamp && (
        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono pt-1">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>
            {normalizedStatus === 'VERIFIED' ? 'Verified on' : 'Last updated'}: {new Date(timestamp).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
};

export default PortfolioVerificationCard;
