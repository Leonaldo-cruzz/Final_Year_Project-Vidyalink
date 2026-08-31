import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { Star, Video, MapPin, Calendar, Clock, CheckCircle, CheckSquare, XCircle, ExternalLink } from 'lucide-react';

const MockInterviewDetailsModal = ({
  isOpen,
  onClose,
  interview,
  isAlumni = true,
  onAccept,
  onDecline,
  onOpenSchedule,
  onComplete,
  loading = false,
}) => {
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [rating, setRating] = useState(4);
  const [technicalSkills, setTechnicalSkills] = useState('');
  const [communication, setCommunication] = useState('');
  const [strengthsInput, setStrengthsInput] = useState('');
  const [strengths, setStrengths] = useState(['Data Structures', 'Problem Solving']);
  const [improvementsInput, setImprovementsInput] = useState('');
  const [improvements, setImprovements] = useState(['System Design Tradeoffs']);
  const [detailedSummary, setDetailedSummary] = useState('');

  if (!interview) return null;

  const otherUser = isAlumni ? interview.student : interview.alumni;

  const handleAddStrength = (e) => {
    e.preventDefault();
    if (!strengthsInput.trim()) return;
    setStrengths([...strengths, strengthsInput.trim()]);
    setStrengthsInput('');
  };

  const handleAddImprovement = (e) => {
    e.preventDefault();
    if (!improvementsInput.trim()) return;
    setImprovements([...improvements, improvementsInput.trim()]);
    setImprovementsInput('');
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    await onComplete(interview._id, {
      feedback: {
        rating,
        technicalSkills: technicalSkills.trim() || 'Good grasp of technical concepts.',
        communication: communication.trim() || 'Clear articulation and positive attitude.',
        strengths,
        improvements,
        detailedSummary: detailedSummary.trim() || 'Candidate demonstrated strong aptitude and readiness.',
      },
    });
    setShowFeedbackForm(false);
    onClose();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'REQUESTED':
        return <Badge variant="amber">Requested</Badge>;
      case 'ACCEPTED':
        return <Badge variant="blue">Accepted (Pending Schedule)</Badge>;
      case 'SCHEDULED':
        return <Badge variant="purple">Scheduled</Badge>;
      case 'COMPLETED':
        return <Badge variant="emerald">Completed & Reviewed</Badge>;
      case 'DECLINED':
        return <Badge variant="rose">Declined</Badge>;
      case 'CANCELLED':
        return <Badge variant="slate">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mock Interview Details & Scorecard" size="lg">
      <div className="space-y-4">
        {/* User Card */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center gap-3">
            <Avatar name={otherUser?.fullName || 'User'} size="lg" />
            <div>
              <h4 className="text-base font-bold text-slate-100">{otherUser?.fullName}</h4>
              <p className="text-xs text-slate-400">{otherUser?.college} {otherUser?.branch ? `• ${otherUser.branch}` : ''}</p>
              <p className="text-xs text-slate-500">{otherUser?.email}</p>
            </div>
          </div>
          <div>{getStatusBadge(interview.status)}</div>
        </div>

        {/* Schedule & Mode Information */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Target Role</span>
              <p className="text-sm font-semibold text-slate-200">{interview.roleTarget}</p>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Format & Mode</span>
              <div className="flex items-center gap-2 mt-0.5">
                {interview.mode === 'ONLINE' ? (
                  <span className="inline-flex items-center gap-1 text-xs text-blue-400 font-medium">
                    <Video className="w-3.5 h-3.5" /> Online Video
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium">
                    <MapPin className="w-3.5 h-3.5" /> In-Person
                  </span>
                )}
                <span className="text-xs text-slate-500">({interview.durationMinutes || 45} mins)</span>
              </div>
            </div>
          </div>

          {interview.scheduledDate && (
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span>{new Date(interview.scheduledDate).toLocaleString()}</span>
              </div>
              {interview.mode === 'ONLINE' && interview.meetingLink && (
                <a
                  href={interview.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-bold hover:bg-blue-600/30 transition-all"
                >
                  Join Meeting <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {interview.mode === 'OFFLINE' && interview.location && (
                <div className="text-xs text-amber-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {interview.location}
                </div>
              )}
            </div>
          )}

          {interview.notes && (
            <div className="pt-2 border-t border-slate-800/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Candidate Notes</span>
              <p className="text-xs text-slate-300 mt-1">{interview.notes}</p>
            </div>
          )}
        </div>

        {/* Existing Completed Scorecard */}
        {interview.feedback?.rating && (
          <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Evaluator Scorecard & Feedback
              </h5>
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(interview.feedback.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <p className="font-bold text-slate-300">Technical Performance</p>
                <p className="text-slate-400 mt-1">{interview.feedback.technicalSkills}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <p className="font-bold text-slate-300">Communication & Presentation</p>
                <p className="text-slate-400 mt-1">{interview.feedback.communication}</p>
              </div>
            </div>

            {interview.feedback.strengths?.length > 0 && (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Key Strengths</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {interview.feedback.strengths.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-xs border border-emerald-500/20">
                      ✓ {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {interview.feedback.improvements?.length > 0 && (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Recommended Growth Areas</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {interview.feedback.improvements.map((im, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 text-xs border border-amber-500/20">
                      ⚡ {im}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {interview.feedback.detailedSummary && (
              <p className="text-xs text-slate-300 italic pt-1 border-t border-slate-800">
                "{interview.feedback.detailedSummary}"
              </p>
            )}
          </div>
        )}

        {/* Feedback Submission Form for Alumni */}
        {isAlumni && showFeedbackForm && (
          <form onSubmit={handleCompleteSubmit} className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-3">
            <h5 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <CheckSquare className="w-4 h-4" /> Submit Scorecard & Mark Interview Completed
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
                    <Star className={`w-6 h-6 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Technical Skills Assessment</label>
                <textarea
                  className="w-full h-16 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                  placeholder="Evaluate coding, architecture, problem solving..."
                  value={technicalSkills}
                  onChange={(e) => setTechnicalSkills(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Communication Assessment</label>
                <textarea
                  className="w-full h-16 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                  placeholder="Articulation, clarity, structural responses..."
                  value={communication}
                  onChange={(e) => setCommunication(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Detailed Scorecard Summary</label>
              <textarea
                className="w-full h-16 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                placeholder="Overall impression and actionable feedback for the student..."
                value={detailedSummary}
                onChange={(e) => setDetailedSummary(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowFeedbackForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={loading}>
                Save Scorecard & Complete
              </Button>
            </div>
          </form>
        )}

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-800">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>

          {isAlumni && interview.status === 'REQUESTED' && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                onClick={async () => {
                  await onDecline(interview._id);
                  onClose();
                }}
              >
                <XCircle className="w-4 h-4 mr-1.5" /> Decline
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  onOpenSchedule(interview);
                }}
              >
                <Calendar className="w-4 h-4 mr-1.5" /> Accept & Schedule
              </Button>
            </div>
          )}

          {isAlumni && (interview.status === 'ACCEPTED' || interview.status === 'SCHEDULED') && !showFeedbackForm && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  onClose();
                  onOpenSchedule(interview);
                }}
              >
                <Calendar className="w-4 h-4 mr-1.5" /> Reschedule
              </Button>
              <Button variant="primary" onClick={() => setShowFeedbackForm(true)}>
                <CheckSquare className="w-4 h-4 mr-1.5" /> Complete with Feedback
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default MockInterviewDetailsModal;
