import React from 'react';
import {
  Award,
  Calendar,
  ExternalLink,
  Eye,
  Download,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Hash,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { formatDate } from '@/utils/formatters';

const STATUS_CONFIG = {
  Verified: { variant: 'success', icon: CheckCircle2, label: 'Verified' },
  Pending: { variant: 'warning', icon: Clock, label: 'Pending Verification' },
  Rejected: { variant: 'danger', icon: XCircle, label: 'Rejected' },
};

const CATEGORY_COLORS = {
  Internship: 'blue',
  Course: 'purple',
  Hackathon: 'amber',
  Workshop: 'slate',
  Competition: 'rose',
  Research: 'indigo',
  'Cloud Certification': 'emerald',
  Other: 'slate',
};

const CertificateCard = ({ certificate, onPreview, onEdit, onDelete }) => {
  const {
    _id,
    title,
    issuer,
    category,
    issueDate,
    expiryDate,
    credentialId,
    credentialUrl,
    certificateFile,
    skills = [],
    verificationStatus = 'Pending',
    rejectionReason,
  } = certificate;

  const statusCfg = STATUS_CONFIG[verificationStatus] || STATUS_CONFIG.Pending;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 flex flex-col justify-between card-hover transition-all duration-200">
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <Badge variant={CATEGORY_COLORS[category] || 'slate'} size="sm">
            {category}
          </Badge>

          <Badge variant={statusCfg.variant} size="sm" className="flex items-center gap-1">
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{statusCfg.label}</span>
          </Badge>
        </div>

        {/* Title & Issuer */}
        <h3 className="text-lg font-bold text-white leading-snug tracking-tight mb-1">
          {title}
        </h3>
        <p className="text-sm font-medium text-slate-400 flex items-center gap-1.5 mb-4">
          <Award className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span>{issuer}</span>
        </p>

        {/* Rejection notice if rejected */}
        {verificationStatus === 'Rejected' && rejectionReason && (
          <div className="mb-4 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            <span className="font-bold">Reason for rejection:</span> {rejectionReason}
          </div>
        )}

        {/* Metadata */}
        <div className="space-y-2 text-xs text-slate-400 mb-4 border-t border-b border-slate-800/60 py-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-slate-500">
              <Calendar className="w-3.5 h-3.5" /> Issued
            </span>
            <span className="font-semibold text-slate-300">
              {formatDate(issueDate)}
            </span>
          </div>

          {expiryDate && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-slate-500">
                <Clock className="w-3.5 h-3.5" /> Expires
              </span>
              <span className="font-semibold text-slate-300">
                {formatDate(expiryDate)}
              </span>
            </div>
          )}

          {credentialId && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-slate-500">
                <Hash className="w-3.5 h-3.5" /> Credential ID
              </span>
              <span className="font-mono text-slate-300 truncate max-w-[150px]">
                {credentialId}
              </span>
            </div>
          )}
        </div>

        {/* Skills */}
        {skills && skills.length > 0 && (
          <div className="flex items-center flex-wrap gap-1.5 mb-5">
            {skills.map((skill, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300 font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Action Buttons */}
      <div className="pt-2 flex items-center justify-between flex-wrap gap-2 border-t border-slate-800/60">
        <div className="flex items-center gap-1.5">
          <Button
            variant="secondary"
            size="xs"
            leftIcon={Eye}
            onClick={() => onPreview(certificate)}
          >
            View
          </Button>

          {certificateFile?.fileUrl && (
            <a
              href={certificateFile.fileUrl}
              download={certificateFile.originalFileName}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="xs" leftIcon={Download}>
                Download
              </Button>
            </a>
          )}

          {credentialUrl && (
            <a
              href={credentialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-blue-400 p-1 transition-colors"
              title="Open Credential Link"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="xs"
            leftIcon={Edit2}
            onClick={() => onEdit(certificate)}
          >
            Edit
          </Button>

          <Button
            variant="danger"
            size="xs"
            leftIcon={Trash2}
            onClick={() => onDelete(_id)}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CertificateCard;
