import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { CheckCircle2, XCircle, CheckSquare, MessageSquare, Target, Star } from 'lucide-react';

const MentorshipDetailsModal = ({
  isOpen,
  onClose,
  request,
  isAlumni = true,
  onAccept,
  onDecline,
  onComplete,
  loading = false,
}) => {
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [actionType, setActionType] = useState(null); // 'complete' | 'decline' | null

  if (!request) return null;

  const otherUser = isAlumni ? request.student : request.alumni;

  const handleAction = async () => {
    if (actionType === 'complete') {
      await onComplete(request._id, {
        feedback: { rating, comment: feedbackComment },
        notes,
      });
      onClose();
    } else if (actionType === 'decline') {
      await onDecline(request._id, { notes });
      onClose();
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="amber">Pending Review</Badge>;
      case 'ACCEPTED':
        return <Badge variant="blue">In Progress / Accepted</Badge>;
      case 'COMPLETED':
        return <Badge variant="emerald">Completed</Badge>;
      case 'DECLINED':
        return <Badge variant="rose">Declined</Badge>;
      case 'CANCELLED':
        return <Badge variant="slate">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mentorship Request Details" size="lg">
      <div className="space-y-4">
        {/* User Card */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center gap-3">
            <Avatar name={otherUser?.fullName || 'User'} size="lg" />
            <div>
              <h4 className="text-base font-bold text-slate-100">{otherUser?.fullName}</h4>
              <p className="text-xs text-slate-400">
                {otherUser?.college} {otherUser?.branch ? `• ${otherUser.branch}` : ''}
              </p>
              <p className="text-xs text-slate-500">{otherUser?.email}</p>
            </div>
          </div>
          <div>{getStatusBadge(request.status)}</div>
        </div>

        {/* Focus & Message */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Topic</span>
            <p className="text-sm font-semibold text-slate-200">{request.topic}</p>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Student Note</span>
            <p className="text-xs text-slate-300 whitespace-pre-line mt-1 bg-slate-950/60 p-3 rounded-lg border border-slate-800/50">
              {request.message}
            </p>
          </div>
          {request.goals && request.goals.length > 0 && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Target Goals</span>
              <ul className="mt-1 space-y-1">
                {request.goals.map((goal, idx) => (
                  <li key={idx} className="text-xs text-slate-300 flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Existing Notes / Feedback */}
        {request.alumniNotes && (
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mentor Notes</span>
            <p className="text-xs text-slate-300 mt-1">{request.alumniNotes}</p>
          </div>
        )}

        {request.feedback?.rating && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-400">Completion Feedback:</span>
              <div className="flex text-amber-400">
                {[...Array(request.feedback.rating)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current" />
                ))}
              </div>
            </div>
            {request.feedback.comment && (
              <p className="text-xs text-slate-300 mt-1">{request.feedback.comment}</p>
            )}
          </div>
        )}

        {/* Completion or Decline Actions Form for Alumni */}
        {isAlumni && actionType === 'complete' && (
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
            <h5 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <CheckSquare className="w-4 h-4" /> Complete Mentorship Session
            </h5>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Overall Rating</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-slate-500 hover:text-amber-400 transition-colors"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Feedback & Advice for Student</label>
              <textarea
                className="w-full h-20 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                placeholder="Share your feedback, recommended next steps, and guidance..."
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setActionType(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleAction} loading={loading}>
                Submit & Complete
              </Button>
            </div>
          </div>
        )}

        {isAlumni && actionType === 'decline' && (
          <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-3">
            <h5 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <XCircle className="w-4 h-4" /> Decline Request
            </h5>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Reason / Note (Optional)</label>
              <textarea
                className="w-full h-16 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                placeholder="Briefly state reason or recommend connecting later..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setActionType(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-rose-600 hover:bg-rose-500"
                onClick={handleAction}
                loading={loading}
              >
                Confirm Decline
              </Button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-800">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>

          {isAlumni && request.status === 'PENDING' && !actionType && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                onClick={() => setActionType('decline')}
              >
                <XCircle className="w-4 h-4 mr-1.5" /> Decline
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  await onAccept(request._id);
                  onClose();
                }}
                loading={loading}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Accept Mentee
              </Button>
            </div>
          )}

          {isAlumni && request.status === 'ACCEPTED' && !actionType && (
            <Button variant="primary" onClick={() => setActionType('complete')}>
              <CheckSquare className="w-4 h-4 mr-1.5" /> Mark Completed & Review
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default MentorshipDetailsModal;
