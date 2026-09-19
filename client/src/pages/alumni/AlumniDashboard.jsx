import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, CalendarCheck, Share2, Lightbulb, GraduationCap,
  CheckCircle2, Calendar, Clock, FolderKanban, Loader2
} from 'lucide-react';

import DashboardLayout from '@/layouts/DashboardLayout';
import { StatCard, SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/constants';
import mentorshipService from '@/services/mentorshipService';
import referralService from '@/services/referralService';

const AlumniDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [mentees, setMentees] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeModalRequest, setActiveModalRequest] = useState(null);
  const [sessionDate, setSessionDate] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Referral Modal
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralCompany, setReferralCompany] = useState('');
  const [referralRole, setReferralRole] = useState('');
  const [submittingReferral, setSubmittingReferral] = useState(false);

  const loadAlumniData = useCallback(async () => {
    try {
      setLoading(true);
      const [reqsRes, menteesRes, refsRes] = await Promise.allSettled([
        mentorshipService.getMyRequests(),
        mentorshipService.getMentees(),
        referralService.getMyReferrals(),
      ]);

      if (reqsRes.status === 'fulfilled') {
        setRequests(Array.isArray(reqsRes.value) ? reqsRes.value : []);
      }
      if (menteesRes.status === 'fulfilled') {
        setMentees(Array.isArray(menteesRes.value) ? menteesRes.value : []);
      }
      if (refsRes.status === 'fulfilled') {
        setReferrals(Array.isArray(refsRes.value) ? refsRes.value : []);
      }
    } catch {
      // Honest state: empty lists
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlumniData();
  }, [loadAlumniData]);

  const handleAcceptRequest = async (req) => {
    try {
      await mentorshipService.acceptRequest(req._id || req.id, {
        scheduledDate: sessionDate || undefined,
      });
      setToastMessage(`Mentorship accepted for ${req.student?.fullName || req.name}! Session invite confirmed.`);
      setActiveModalRequest(null);
      setSessionDate('');
      loadAlumniData();
      setTimeout(() => setToastMessage(''), 4000);
    } catch {
      setToastMessage('Failed to accept mentorship inquiry. Please try again.');
      setTimeout(() => setToastMessage(''), 4000);
    }
  };

  const handleDeclineRequest = async (reqId) => {
    try {
      await mentorshipService.declineRequest(reqId);
      setToastMessage('Mentorship request declined.');
      setRequests((prev) => prev.filter((r) => (r._id || r.id) !== reqId));
      setTimeout(() => setToastMessage(''), 3000);
    } catch {
      setToastMessage('Failed to decline request.');
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const handleConfirmScheduleModal = () => {
    if (!activeModalRequest) return;
    handleAcceptRequest(activeModalRequest);
  };

  const handlePostReferral = async (e) => {
    e.preventDefault();
    if (!referralCompany || !referralRole) return;
    try {
      setSubmittingReferral(true);
      await referralService.createReferral({
        company: referralCompany,
        role: referralRole,
      });
      setShowReferralModal(false);
      setToastMessage(`Referral opportunity posted for ${referralRole} at ${referralCompany}!`);
      setReferralCompany('');
      setReferralRole('');
      loadAlumniData();
      setTimeout(() => setToastMessage(''), 4000);
    } catch {
      setToastMessage('Failed to publish referral. Please try again.');
      setTimeout(() => setToastMessage(''), 4000);
    } finally {
      setSubmittingReferral(false);
    }
  };

  return (
    <DashboardLayout>
      {/* Alumni Header */}
      <div className="mb-6 rounded-xl border border-slate-800/80 bg-linear-to-r from-slate-900/90 via-slate-900/60 to-slate-950 p-5 sm:p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {user?.college && (
                <span className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-widest text-orange-300">
                  <GraduationCap className="h-3.5 w-3.5" /> {user.college}
                </span>
              )}
              {user?.graduationYear && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs text-slate-400">Class of {user.graduationYear}</span>
                </>
              )}
              <span className="text-slate-600">•</span>
              <span className="text-xs text-emerald-400 font-semibold">Alumni Mentor</span>
            </div>

            <h1 className="page-title text-white text-2xl sm:text-3xl font-extrabold">
              Alumni Mentorship & Referral Hub
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Welcome back{user?.fullName ? `, ${user.fullName}` : ''}. Give back to upcoming engineers, review verified project evidence, and sponsor referrals for university talent.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={Share2}
              onClick={() => setShowReferralModal(true)}
            >
              Post Campus Referral
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={FolderKanban}
              onClick={() => navigate(ROUTES.PROJECTS)}
            >
              Explore Projects
            </Button>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-300"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            {toastMessage}
          </span>
          <button onClick={() => setToastMessage('')} className="text-xs text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Real Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
        <StatCard
          label="Active Mentees"
          value={mentees.length.toString()}
          icon={Users}
          color="amber"
        />
        <StatCard
          label="Pending Inquiries"
          value={requests.length.toString()}
          icon={CalendarCheck}
          color="emerald"
        />
        <StatCard
          label="Referrals Posted"
          value={referrals.length.toString()}
          icon={Share2}
          color="blue"
        />
        <StatCard
          label="Guidance Delivered"
          value={mentees.length.toString()}
          icon={Lightbulb}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Mentorship Requests */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard
            title="Pending Mentorship Inquiries"
            subtitle="Undergraduate engineering students requesting career and technical guidance"
          >
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-orange-300" /> Loading inquiries…
              </div>
            ) : requests.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                <h4 className="text-sm font-bold text-white">No Mentorship Requests Yet</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Student inquiries for career guidance and capstone project reviews will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((req) => {
                  const studentName = req.student?.fullName || req.name || 'Student Candidate';
                  const studentCollege = req.student?.college || req.college || 'Engineering';
                  const studentBranch = req.student?.branch || req.branch || '';
                  const reqId = req._id || req.id;

                  return (
                    <div
                      key={reqId}
                      className="p-4 sm:p-5 rounded-xl bg-slate-950/75 border border-slate-800 space-y-3 transition-all hover:border-slate-700"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5">
                          <Avatar name={studentName} size="md" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">{studentName}</h4>
                              <Badge variant="blue" size="sm">Mentorship Request</Badge>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {studentCollege} {studentBranch ? `• ${studentBranch}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeclineRequest(reqId)}
                          >
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            leftIcon={Calendar}
                            onClick={() => setActiveModalRequest(req)}
                          >
                            Accept & Schedule
                          </Button>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                        <span className="font-semibold text-orange-300 block mb-1">Focus: {req.focusSkill || req.skill}</span>
                        "{req.message}"
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Active Mentees */}
          <SectionCard
            title="Active Mentorship Cohort"
            subtitle="Students currently receiving technical advisement"
          >
            {mentees.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-white">No Active Mentees Yet</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Accepted student mentorships and upcoming advisory calls will be tracked here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {mentees.map((m) => {
                  const menteeName = m.student?.fullName || m.name || 'Mentee';
                  const menteeCollege = m.student?.college || m.college || 'Engineering';
                  const nextSession = m.scheduledDate
                    ? new Date(m.scheduledDate).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Session Active';

                  return (
                    <div
                      key={m._id || m.id}
                      className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar name={menteeName} size="md" />
                        <div>
                          <h4 className="text-sm font-bold text-white">{menteeName}</h4>
                          <p className="text-xs text-slate-400">{menteeCollege}</p>
                          <span className="inline-block mt-1 text-[11px] font-semibold text-orange-300 font-mono">
                            {m.focusSkill || m.track}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-slate-500" /> {nextSession}
                        </span>
                        <Badge variant="emerald" size="sm">Active</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right col: Referral Sponsor Card & Guidelines */}
        <div className="space-y-6">
          <SectionCard
            title="Referrals You've Sponsored"
            subtitle="Campus opportunities provided by you"
          >
            {referrals.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <Share2 className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">No company referrals posted yet.</p>
                <Button size="sm" variant="ghost" onClick={() => setShowReferralModal(true)}>
                  Post Referral
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.map((r) => (
                  <div key={r._id || r.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <p className="text-xs font-bold text-white">{r.role}</p>
                    <p className="text-[11px] text-orange-300">{r.company}</p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Posted {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recent'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Alumni Impact Guidelines">
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                As an alumnus, your endorsements and technical evaluations carry significant weight with hiring partners.
              </p>
              <div className="p-3 rounded-lg bg-orange-300/10 border border-orange-300/20 text-orange-200">
                <span className="font-bold block mb-1">Verify Project Evidence</span>
                Inspect student repository deliverables to ensure code quality aligns with industry practices before submitting referrals.
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Accept & Schedule Mentorship Modal */}
      <Modal
        open={Boolean(activeModalRequest)}
        onClose={() => setActiveModalRequest(null)}
        title="Schedule Mentorship Session"
        size="md"
      >
        {activeModalRequest && (
          <div className="space-y-4 text-sm text-slate-300">
            <div>
              <p className="text-xs text-slate-400">Student Candidate</p>
              <p className="text-base font-bold text-white">
                {activeModalRequest.student?.fullName || activeModalRequest.name}
              </p>
              <p className="text-xs text-slate-400">
                {activeModalRequest.student?.college || activeModalRequest.college} • {activeModalRequest.student?.branch || activeModalRequest.branch}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Session Date & Time
              </label>
              <input
                type="datetime-local"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button variant="ghost" onClick={() => setActiveModalRequest(null)}>
                Cancel
              </Button>
              <Button variant="primary" leftIcon={CalendarCheck} onClick={handleConfirmScheduleModal}>
                Confirm Session
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Referral Modal */}
      <Modal
        open={showReferralModal}
        onClose={() => setShowReferralModal(false)}
        title="Post Campus Hiring Referral"
        size="md"
      >
        <form onSubmit={handlePostReferral} className="space-y-4 text-sm text-slate-300">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Hiring Company / Organization
            </label>
            <input
              type="text"
              required
              value={referralCompany}
              onChange={(e) => setReferralCompany(e.target.value)}
              placeholder="e.g. Google, Microsoft, Tech Corp"
              className="form-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Role / Position Title
            </label>
            <input
              type="text"
              required
              value={referralRole}
              onChange={(e) => setReferralRole(e.target.value)}
              placeholder="e.g. Graduate Software Engineer, Systems Intern"
              className="form-input"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowReferralModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" leftIcon={Share2} disabled={submittingReferral}>
              {submittingReferral ? 'Publishing…' : 'Publish Referral'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default AlumniDashboard;
