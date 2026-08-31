import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { Building2, Briefcase, ExternalLink, Edit3, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';

const ReferralDetailsModal = ({
  isOpen,
  onClose,
  referral,
  isAlumni = true,
  onUpdateStatus,
  loading = false,
}) => {
  const [editingStatus, setEditingStatus] = useState(false);
  const [status, setStatus] = useState(referral?.status || 'SUBMITTED');
  const [internalNotes, setInternalNotes] = useState(referral?.internalNotes || '');

  if (!referral) return null;

  const otherUser = isAlumni ? referral.student : referral.alumni;

  const handleStatusSave = async () => {
    await onUpdateStatus(referral._id, {
      status,
      internalNotes,
    });
    setEditingStatus(false);
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'DRAFT':
        return <Badge variant="slate">Draft</Badge>;
      case 'SUBMITTED':
        return <Badge variant="amber">Submitted</Badge>;
      case 'UNDER_REVIEW':
        return <Badge variant="blue">Under Review</Badge>;
      case 'REFERRED':
        return <Badge variant="emerald">Referred (Active)</Badge>;
      case 'REJECTED':
        return <Badge variant="rose">Not Selected</Badge>;
      case 'CLOSED':
        return <Badge variant="slate">Closed / Filled</Badge>;
      default:
        return <Badge>{st}</Badge>;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Referral Lifecycle & Details" size="lg">
      <div className="space-y-4">
        {/* Header User Card */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center gap-3">
            <Avatar name={otherUser?.fullName || 'User'} size="lg" />
            <div>
              <h4 className="text-base font-bold text-slate-100">{otherUser?.fullName}</h4>
              <p className="text-xs text-slate-400">{otherUser?.college} {otherUser?.branch ? `• ${otherUser.branch}` : ''}</p>
              <p className="text-xs text-slate-500">{otherUser?.email}</p>
            </div>
          </div>
          <div>{getStatusBadge(referral.status)}</div>
        </div>

        {/* Job Details Card */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Company</span>
              <p className="text-sm font-semibold text-slate-100 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-4 h-4 text-emerald-400" />
                {referral.company}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Job Role</span>
              <p className="text-sm font-semibold text-slate-100 flex items-center gap-1.5 mt-0.5">
                <Briefcase className="w-4 h-4 text-blue-400" />
                {referral.jobTitle}
              </p>
            </div>
          </div>

          {referral.jobUrl && (
            <div className="pt-2 border-t border-slate-800/60">
              <a
                href={referral.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                View Job Posting <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {referral.message && (
            <div className="pt-2 border-t border-slate-800/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Note for Student</span>
              <p className="text-xs text-slate-300 mt-1 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                {referral.message}
              </p>
            </div>
          )}

          {isAlumni && referral.internalNotes && !editingStatus && (
            <div className="pt-2 border-t border-slate-800/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Internal Notes</span>
              <p className="text-xs text-slate-400 mt-1">{referral.internalNotes}</p>
            </div>
          )}
        </div>

        {/* Status Lifecycle Update for Alumni */}
        {isAlumni && editingStatus ? (
          <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/30 space-y-3">
            <h5 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <Edit3 className="w-4 h-4" /> Update Referral Progress & Status
            </h5>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                <option value="REFERRED">REFERRED (Internal submission done)</option>
                <option value="REJECTED">REJECTED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Internal Notes</label>
              <textarea
                className="w-full h-16 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                placeholder="Notes for your tracking..."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingStatus(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleStatusSave} loading={loading}>
                Save Changes
              </Button>
            </div>
          </div>
        ) : isAlumni ? (
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => setEditingStatus(true)}>
              <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Update Status & Notes
            </Button>
          </div>
        ) : null}

        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-800">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ReferralDetailsModal;
