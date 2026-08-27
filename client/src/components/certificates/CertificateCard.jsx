import React from 'react';
import {
  Award,
  Calendar,
  ExternalLink,
  Eye,
  Download,
  Edit2,
  Trash2,
  Clock,
  Hash,
  ShieldCheck,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import VerificationBadge from '@/components/verification/VerificationBadge';
import { formatDate } from '@/utils/formatters';
import { submitVerification } from '@/services/verificationService';

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

const CertificateCard = ({ certificate, onPreview, onEdit, onDelete, onVerified }) => {
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
    verification,
  } = certificate;

  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState('');
  const [submitSuccess, setSubmitSuccess] = React.useState(false);

  const handleSubmitForVerification = async () => {
    try {
      setSubmitting(true);
      setSubmitError('');
      await submitVerification({ targetType: 'CERTIFICATE', targetId: _id });
      setSubmitSuccess(true);
      if (onVerified) onVerified(_id);
    } catch (err) {
      setSubmitError(err?.response?.data?.message || 'Failed to submit for verification');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 flex flex-col justify-between card-hover transition-all duration-200">
      <div>
        {/* Header Badges */}
        <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
          <Badge variant={CATEGORY_COLORS[category] || 'slate'} size="sm">
            {category}
          </Badge>

          <VerificationBadge
            verification={verification}
            targetType="CERTIFICATE"
            targetId={_id}
            size="sm"
            showDetails={true}
          />
        </div>

        {/* Title & Issuer */}
        <h3 className="text-lg font-bold text-white leading-snug tracking-tight mb-1">
          {title}
        </h3>
        <p className="text-sm font-medium text-slate-400 flex items-center gap-1.5 mb-4">
          <Award className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span>{issuer}</span>
        </p>

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
      <div className="pt-2 flex flex-col gap-2 border-t border-slate-800/60">
        {submitError && (
          <p className="text-xs text-red-400 text-center">{submitError}</p>
        )}
        {submitSuccess && (
          <p className="text-xs text-emerald-400 text-center">Submitted for verification!</p>
        )}
        <div className="flex items-center justify-between flex-wrap gap-2">
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
              variant="outline"
              size="xs"
              leftIcon={ShieldCheck}
              loading={submitting}
              onClick={handleSubmitForVerification}
            >
              Submit Verify
            </Button>
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
    </div>
  );
};

export default CertificateCard;
