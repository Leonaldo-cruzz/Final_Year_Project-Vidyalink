import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, CalendarCheck, Share2, GraduationCap,
  CheckCircle2, Calendar, Clock, FolderKanban, Loader2,
  Award, Star, Video, MapPin, AlertCircle,
  Lock, Eye
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
import { getErrorMessage } from '@/utils/formatters';

const AlumniDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [mentees, setMentees] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [mockInterviews, setMockInterviews] = useState([]);
  const [endorsements, setEndorsements] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeModalRequest, setActiveModalRequest] = useState(null);
  const [sessionDate, setSessionDate] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Referral Modal
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralCompany, setReferralCompany] = useState('');
  const [referralRole, setReferralRole] = useState('');
  const [submittingReferral, setSubmittingReferral] = useState(false);

  // Skill Endorsement Modal
  const [showEndorseModal, setShowEndorseModal] = useState(false);
  const [endorseTarget, setEndorseTarget] = useState(null);
  const [endorseSkill, setEndorseSkill] = useState('');
  const [endorseNotes, setEndorseNotes] = useState('');
  const [submittingEndorse, setSubmittingEndorse] = useState(false);
  const [endorseError, setEndorseError] = useState('');

  // Schedule Mock Interview Modal
  const [showMockModal, setShowMockModal] = useState(false);
  const [mockTargetStudent, setMockTargetStudent] = useState(null);
  const [mockDateTime, setMockDateTime] = useState('');
  const [mockMode, setMockMode] = useState('online');
  const [mockDomain, setMockDomain] = useState('Full Stack System Architecture');
  const [mockLink, setMockLink] = useState('');
  const [mockLocation, setMockLocation] = useState('');
  const [submittingMock, setSubmittingMock] = useState(false);
  const [mockError, setMockError] = useState('');

  // Structured Rubric Evaluation Modal
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [evalInterview, setEvalInterview] = useState(null);
  const [ratings, setRatings] = useState({
    technicalKnowledge: 4,
    problemSolving: 4,
    communication: 4,
    projectUnderstanding: 4,
    confidence: 4,
  });
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [submittingEval, setSubmittingEval] = useState(false);
  const [evalError, setEvalError] = useState('');

  // View Evaluation Detail Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailInterview, setDetailInterview] = useState(null);

  const calculatedScore = useMemo(() => {
    const sum =
      (ratings.technicalKnowledge || 0) +
      (ratings.problemSolving || 0) +
      (ratings.communication || 0) +
      (ratings.projectUnderstanding || 0) +
      (ratings.confidence || 0);
    return Math.round((sum / 25) * 100);
  }, [ratings]);

  const loadAlumniData = useCallback(async () => {
    try {
      setLoading(true);
      const [reqsRes, menteesRes, refsRes, interviewsRes, endorsementsRes] =
        await Promise.allSettled([
          mentorshipService.getMyRequests(),
          mentorshipService.getMentees(),
          referralService.getMyReferrals(),
          mentorshipService.getMyMockInterviews(),
          mentorshipService.getMyEndorsements(),
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
      if (interviewsRes.status === 'fulfilled') {
        setMockInterviews(Array.isArray(interviewsRes.value) ? interviewsRes.value : []);
      }
      if (endorsementsRes.status === 'fulfilled') {
        setEndorsements(Array.isArray(endorsementsRes.value) ? endorsementsRes.value : []);
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

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  const handleAcceptRequest = async (req) => {
    try {
      await mentorshipService.acceptRequest(req._id || req.id, {
        scheduledDate: sessionDate || undefined,
      });
      showToast(`Mentorship accepted for ${req.student?.fullName || req.name}! Session invite confirmed.`);
      setActiveModalRequest(null);
      setSessionDate('');
      loadAlumniData();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to accept mentorship inquiry. Please try again.'));
    }
  };

  const handleDeclineRequest = async (reqId) => {
    try {
      await mentorshipService.declineRequest(reqId);
      showToast('Mentorship request declined.');
      setRequests((prev) => prev.filter((r) => (r._id || r.id) !== reqId));
    } catch {
      showToast('Failed to decline request.');
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
      showToast(`Referral opportunity posted for ${referralRole} at ${referralCompany}!`);
      setReferralCompany('');
      setReferralRole('');
      loadAlumniData();
    } catch {
      showToast('Failed to publish referral. Please try again.');
    } finally {
      setSubmittingReferral(false);
    }
  };

  // Skill Endorsement Handlers
  const openEndorseModal = (student) => {
    setEndorseTarget(student);
    setEndorseSkill('');
    setEndorseNotes('');
    setEndorseError('');
    setShowEndorseModal(true);
  };

  const handleEndorseSubmit = async (e) => {
    e.preventDefault();
    if (!endorseTarget || !endorseSkill.trim()) return;

    try {
      setSubmittingEndorse(true);
      setEndorseError('');
      const studentId = endorseTarget._id || endorseTarget.id;
      await mentorshipService.endorseSkill({
        studentId,
        skill: endorseSkill.trim(),
        notes: endorseNotes.trim() || undefined,
      });

      setShowEndorseModal(false);
      showToast(`Successfully endorsed ${endorseTarget.fullName || 'student'} in ${endorseSkill.trim()}!`);
      setEndorseSkill('');
      setEndorseNotes('');
      loadAlumniData();
    } catch (err) {
      setEndorseError(getErrorMessage(err, 'Failed to endorse skill.'));
    } finally {
      setSubmittingEndorse(false);
    }
  };

  // Mock Interview Handlers
  const openMockModal = (student = null) => {
    setMockTargetStudent(student || mentees[0]?.student || mentees[0] || null);
    // default to tomorrow at 10:00 AM
    const tomorrow = new Date(Date.now() + 86400000);
    tomorrow.setHours(10, 0, 0, 0);
    setMockDateTime(tomorrow.toISOString().slice(0, 16));
    setMockMode('online');
    setMockDomain('Full Stack System Architecture');
    setMockLink('https://meet.google.com/vl-interview');
    setMockLocation('');
    setMockError('');
    setShowMockModal(true);
  };

  const handleScheduleMockSubmit = async (e) => {
    e.preventDefault();
    if (!mockTargetStudent || !mockDateTime || !mockDomain.trim()) return;

    try {
      setSubmittingMock(true);
      setMockError('');
      const studentId = mockTargetStudent._id || mockTargetStudent.id;
      await mentorshipService.scheduleMockInterview({
        studentId,
        scheduledDate: new Date(mockDateTime).toISOString(),
        mode: mockMode,
        meetingLink: mockMode === 'online' ? mockLink.trim() : null,
        location: mockMode === 'in_person' ? mockLocation.trim() : null,
        focusDomain: mockDomain.trim(),
      });

      setShowMockModal(false);
      showToast(`Mock interview scheduled with ${mockTargetStudent.fullName || 'candidate'}!`);
      loadAlumniData();
    } catch (err) {
      setMockError(getErrorMessage(err, 'Failed to schedule mock interview.'));
    } finally {
      setSubmittingMock(false);
    }
  };

  const handleCancelInterview = async (interviewId) => {
    if (!window.confirm('Are you sure you want to cancel this mock interview?')) return;
    try {
      await mentorshipService.updateMockInterviewStatus(interviewId, {
        status: 'cancelled',
        cancellationReason: 'Cancelled by alumni mentor',
      });
      showToast('Mock interview cancelled.');
      loadAlumniData();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to cancel interview.'));
    }
  };

  // Structured Evaluation Rubric Handlers
  const openEvalModal = (interview) => {
    setEvalInterview(interview);
    setRatings({
      technicalKnowledge: 4,
      problemSolving: 4,
      communication: 4,
      projectUnderstanding: 4,
      confidence: 4,
    });
    setStrengths('');
    setImprovements('');
    setPrivateNotes('');
    setEvalError('');
    setShowEvalModal(true);
  };

  const handleEvalSubmit = async (e) => {
    e.preventDefault();
    if (!evalInterview) return;

    if (!strengths.trim() || strengths.trim().length < 5) {
      setEvalError('Please provide detailed strengths feedback (at least 5 characters).');
      return;
    }
    if (!improvements.trim() || improvements.trim().length < 5) {
      setEvalError('Please provide concrete improvement suggestions (at least 5 characters).');
      return;
    }

    try {
      setSubmittingEval(true);
      setEvalError('');
      await mentorshipService.submitMockInterviewFeedback(evalInterview._id, {
        technicalKnowledge: Number(ratings.technicalKnowledge),
        problemSolving: Number(ratings.problemSolving),
        communication: Number(ratings.communication),
        projectUnderstanding: Number(ratings.projectUnderstanding),
        confidence: Number(ratings.confidence),
        strengths: strengths.trim(),
        improvements: improvements.trim(),
        privateNotes: privateNotes.trim() || undefined,
        feedbackVisibility: 'published',
      });

      setShowEvalModal(false);
      showToast(`Evaluation recorded! Final score ${calculatedScore}/100 published to student.`);
      loadAlumniData();
    } catch (err) {
      setEvalError(getErrorMessage(err, 'Failed to submit interview evaluation.'));
    } finally {
      setSubmittingEval(false);
    }
  };

  const openDetailModal = (interview) => {
    setDetailInterview(interview);
    setShowDetailModal(true);
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
              <span className="text-xs text-emerald-400 font-semibold">Alumni Mentor & Evaluator</span>
            </div>

            <h1 className="page-title text-white text-2xl sm:text-3xl font-extrabold">
              Alumni Mentorship & Evaluation Hub
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Welcome back{user?.fullName ? `, ${user.fullName}` : ''}. Endorse verified student skills, conduct structured mock interviews with transparent scoring, and sponsor campus talent.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={Calendar}
              onClick={() => openMockModal()}
            >
              Schedule Mock Interview
            </Button>
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
              Explore Student Portfolios
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
          label="Mock Interviews"
          value={mockInterviews.length.toString()}
          icon={CalendarCheck}
          color="blue"
        />
        <StatCard
          label="Skills Endorsed"
          value={endorsements.length.toString()}
          icon={Award}
          color="emerald"
        />
        <StatCard
          label="Referrals Posted"
          value={referrals.length.toString()}
          icon={Share2}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Main Alumni Operations */}
        <div className="lg:col-span-2 space-y-6">

          {/* SECTION: Mock Technical Interviews */}
          <SectionCard
            title="Mock Technical Interviews & Evaluations"
            subtitle="Conduct structured interviews with 5-dimension rubric scoring and constructive feedback"
            action={
              <Button
                size="sm"
                variant="secondary"
                leftIcon={Calendar}
                onClick={() => openMockModal()}
              >
                Schedule Interview
              </Button>
            }
          >
            {loading ? (
              <div className="py-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-orange-300" /> Loading interviews…
              </div>
            ) : mockInterviews.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <CalendarCheck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-white">No Mock Interviews Scheduled</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Schedule technical practice sessions with undergraduate mentees to evaluate problem-solving and communication.
                </p>
                <Button
                  size="sm"
                  variant="primary"
                  className="mt-2"
                  leftIcon={Calendar}
                  onClick={() => openMockModal()}
                >
                  Schedule First Mock Interview
                </Button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {mockInterviews.map((item) => {
                  const studentName = item.student?.fullName || 'Student Candidate';
                  const isCompleted = item.status === 'completed';
                  const isCancelled = item.status === 'cancelled';
                  const evalData = item.evaluation;

                  return (
                    <div
                      key={item._id}
                      className="p-4 rounded-xl bg-slate-950/75 border border-slate-800 space-y-3 transition-all hover:border-slate-700"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <Avatar name={studentName} size="md" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">{studentName}</h4>
                              <Badge
                                variant={
                                  isCompleted ? 'emerald' : isCancelled ? 'rose' : 'blue'
                                }
                                size="sm"
                              >
                                {item.status.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-xs text-orange-300 font-mono mt-0.5 font-semibold">
                              {item.focusDomain}
                            </p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                {new Date(item.scheduledDate).toLocaleString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1 capitalize">
                                {item.mode === 'online' ? (
                                  <Video className="w-3 h-3 text-blue-400" />
                                ) : (
                                  <MapPin className="w-3 h-3 text-amber-400" />
                                )}
                                {item.mode}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Interview Actions */}
                        <div className="flex items-center gap-2 self-start sm:self-center">
                          {isCompleted ? (
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <span className="text-[11px] text-slate-400 block">Overall Score</span>
                                <span className="text-sm font-extrabold text-emerald-400">
                                  {evalData?.overallScore ?? 80}%
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="secondary"
                                leftIcon={Eye}
                                onClick={() => openDetailModal(item)}
                              >
                                Scorecard
                              </Button>
                            </div>
                          ) : isCancelled ? (
                            <span className="text-xs text-slate-500 italic">
                              {item.cancellationReason || 'Cancelled'}
                            </span>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCancelInterview(item._id)}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="primary"
                                leftIcon={Star}
                                onClick={() => openEvalModal(item)}
                              >
                                Evaluate & Record Score
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {item.meetingLink && !isCompleted && !isCancelled && (
                        <div className="text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between">
                          <span className="truncate">Link: {item.meetingLink}</span>
                          <a
                            href={item.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-orange-300 hover:underline font-semibold ml-2 shrink-0"
                          >
                            Join Call
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* SECTION: Active Mentees & Skill Endorsement Trigger */}
          <SectionCard
            title="Active Mentorship Cohort"
            subtitle="Students receiving guidance — endorse demonstrated skills or arrange mock interviews"
          >
            {mentees.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-white">No Active Mentees Yet</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Accepted student mentorships and upcoming advisory calls will be tracked here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {mentees.map((m) => {
                  const studentObj = m.student || m;
                  const menteeName = studentObj.fullName || m.name || 'Mentee';
                  const menteeCollege = studentObj.college || 'Engineering';

                  return (
                    <div
                      key={m._id || m.id}
                      className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 flex flex-col justify-between hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar name={menteeName} size="md" />
                        <div>
                          <h4 className="text-sm font-bold text-white">{menteeName}</h4>
                          <p className="text-xs text-slate-400">{menteeCollege}</p>
                          <span className="inline-block mt-1 text-[11px] font-semibold text-orange-300 font-mono">
                            {m.focusSkill || m.track || 'General Mentorship'}
                          </span>
                        </div>
                      </div>

                      {/* Mentee Actions: Endorse Skill & Mock Interview */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs flex-1"
                          leftIcon={Award}
                          onClick={() => openEndorseModal(studentObj)}
                        >
                          Endorse Skill
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs flex-1"
                          leftIcon={Calendar}
                          onClick={() => openMockModal(studentObj)}
                        >
                          Mock Interview
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* SECTION: Pending Mentorship Inquiries */}
          <SectionCard
            title="Pending Mentorship Inquiries"
            subtitle="Undergraduate engineering students requesting career and technical guidance"
          >
            {loading ? (
              <div className="py-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
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
              <div className="space-y-3.5">
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
                        <span className="font-semibold text-orange-300 block mb-1">
                          Focus: {req.focusSkill || req.skill}
                        </span>
                        "{req.message}"
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right col: Skills You've Endorsed & Referrals */}
        <div className="space-y-6">

          {/* Endorsements Given */}
          <SectionCard
            title="Skills You've Endorsed"
            subtitle="Verified technical badges issued to university talent"
          >
            {endorsements.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <Award className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">No skill endorsements submitted yet.</p>
                <p className="text-[11px] text-slate-500">
                  Select a student from your active mentees to endorse their demonstrated skills.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {endorsements.map((end) => (
                  <div
                    key={end._id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        {end.student?.fullName || 'Student'}
                      </span>
                      <Badge variant="emerald" size="sm">
                        {end.skill}
                      </Badge>
                    </div>
                    {end.notes && (
                      <p className="text-[11px] text-slate-400 italic">
                        "{end.notes}"
                      </p>
                    )}
                    <p className="text-[10px] text-slate-500">
                      Endorsed {new Date(end.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Referral Sponsor Card */}
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

          {/* Guidelines */}
          <SectionCard title="Alumni Evaluation Standards">
            <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Objective Rubric:</strong> Rate all 5 technical dimensions on a 1–5 scale. Overall score is normalized to 100%.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Constructive Feedback:</strong> Detail tangible architectural strengths and concrete growth areas.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Confidential Notes:</strong> Private interviewer notes remain strictly hidden from student candidates.
                </span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── MODAL 1: Skill Endorsement Modal ────────────────────────────────────── */}
      <Modal
        open={showEndorseModal}
        onClose={() => setShowEndorseModal(false)}
        title={`Endorse Technical Skill — ${endorseTarget?.fullName || 'Student'}`}
        size="md"
      >
        <form onSubmit={handleEndorseSubmit} className="space-y-4 text-sm text-slate-300">
          {endorseError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              {endorseError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Technical Skill or Tool
            </label>
            <input
              type="text"
              required
              value={endorseSkill}
              onChange={(e) => setEndorseSkill(e.target.value)}
              placeholder="e.g. React.js, System Architecture, Node.js, Python"
              className="form-input"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Endorse demonstrated technical capabilities observed through projects or mentorship.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Endorsement Note (Optional)
            </label>
            <textarea
              rows={3}
              value={endorseNotes}
              onChange={(e) => setEndorseNotes(e.target.value)}
              placeholder="Explain why this student demonstrated proficiency in this skill..."
              className="form-input resize-y"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowEndorseModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" leftIcon={Award} disabled={submittingEndorse}>
              {submittingEndorse ? 'Endorsing…' : 'Confirm Skill Endorsement'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 2: Schedule Mock Interview Modal ──────────────────────────────── */}
      <Modal
        open={showMockModal}
        onClose={() => setShowMockModal(false)}
        title="Schedule Structured Mock Interview"
        size="md"
      >
        <form onSubmit={handleScheduleMockSubmit} className="space-y-4 text-sm text-slate-300">
          {mockError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              {mockError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Target Mentee / Candidate
            </label>
            <select
              className="form-input"
              value={mockTargetStudent?._id || ''}
              onChange={(e) => {
                const found = mentees.find((m) => (m.student?._id || m.student) === e.target.value);
                setMockTargetStudent(found?.student || found);
              }}
              required
            >
              {mentees.map((m) => {
                const s = m.student || m;
                return (
                  <option key={s._id} value={s._id}>
                    {s.fullName} ({s.college || 'Engineering'})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Technical Focus Domain
            </label>
            <input
              type="text"
              required
              value={mockDomain}
              onChange={(e) => setMockDomain(e.target.value)}
              placeholder="e.g. Distributed Systems, Frontend Architecture, Data Structures"
              className="form-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Date & Time
              </label>
              <input
                type="datetime-local"
                required
                value={mockDateTime}
                onChange={(e) => setMockDateTime(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Interview Mode
              </label>
              <select
                className="form-input"
                value={mockMode}
                onChange={(e) => setMockMode(e.target.value)}
              >
                <option value="online">Online (Video Call)</option>
                <option value="in_person">In-Person</option>
              </select>
            </div>
          </div>

          {mockMode === 'online' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Meeting Link (Google Meet / Zoom / Teams)
              </label>
              <input
                type="url"
                value={mockLink}
                onChange={(e) => setMockLink(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="form-input"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Campus Location / Room
              </label>
              <input
                type="text"
                value={mockLocation}
                onChange={(e) => setMockLocation(e.target.value)}
                placeholder="e.g. Campus Library Room 302"
                className="form-input"
              />
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowMockModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" leftIcon={Calendar} disabled={submittingMock}>
              {submittingMock ? 'Scheduling…' : 'Confirm & Send Invite'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 3: Structured Rubric Evaluation Modal ─────────────────────────── */}
      <Modal
        open={showEvalModal}
        onClose={() => setShowEvalModal(false)}
        title={`Mock Interview Rubric Evaluation — ${evalInterview?.student?.fullName || 'Candidate'}`}
        size="lg"
      >
        <form onSubmit={handleEvalSubmit} className="space-y-5 text-sm text-slate-300">
          {evalError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              {evalError}
            </div>
          )}

          {/* Live Score Display Banner */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400 block">
                Server-Calculated Overall Score
              </span>
              <p className="text-xs text-slate-300 mt-0.5">
                Formula: (Sum of Ratings / 25 Maximum) × 100
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-white">{calculatedScore}</span>
              <span className="text-emerald-400 font-bold text-lg"> / 100</span>
            </div>
          </div>

          {/* 5 Dimensions Rubric */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Evaluation Dimensions (1 to 5 Stars)
            </h4>

            {[
              { key: 'technicalKnowledge', label: 'Technical Knowledge', desc: 'Core engineering concepts, stack fundamentals, and architectural mastery' },
              { key: 'problemSolving', label: 'Problem-Solving & Coding', desc: 'Analytical thinking, algorithmic edge cases, and methodical breakdown' },
              { key: 'communication', label: 'Communication & Articulation', desc: 'Clarity of thought, active listening, and technical presentation' },
              { key: 'projectUnderstanding', label: 'Project Understanding', desc: 'Depth of knowledge on their verified capstone & GitHub projects' },
              { key: 'confidence', label: 'Confidence & Professionalism', desc: 'Poise under pressure, body language, and professional demeanor' },
            ].map(({ key, label, desc }) => (
              <div
                key={key}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-xs font-bold text-white">{label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
                </div>

                {/* Rating buttons 1 to 5 */}
                <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => setRatings((prev) => ({ ...prev, [key]: val }))}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        ratings[key] === val
                          ? 'bg-orange-300 text-slate-950 shadow-md ring-2 ring-orange-300/40 font-black'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Strengths & Improvements */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Key Strengths <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="Highlight what the candidate did exceptionally well..."
                className="form-input resize-y"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Actionable Improvements <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                placeholder="Suggest concrete areas and resources to study before real interviews..."
                className="form-input resize-y"
              />
            </div>
          </div>

          {/* Confidential Interviewer Notes */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Private Interviewer Notes (Confidential)
              </label>
              <span className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Hidden from candidate
              </span>
            </div>
            <textarea
              rows={2}
              value={privateNotes}
              onChange={(e) => setPrivateNotes(e.target.value)}
              placeholder="Internal reminders or campus hiring recommendations (only visible to you)..."
              className="form-input resize-y"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowEvalModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" leftIcon={CheckCircle2} disabled={submittingEval}>
              {submittingEval ? 'Publishing…' : 'Submit Evaluation & Publish Score'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 4: View Scorecard Detail Modal ─────────────────────────────────── */}
      <Modal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Evaluation Scorecard — ${detailInterview?.student?.fullName || 'Candidate'}`}
        size="md"
      >
        {detailInterview?.evaluation && (
          <div className="space-y-4 text-sm text-slate-300">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <div>
                <p className="text-xs text-emerald-400 font-semibold uppercase">Overall Result</p>
                <p className="text-xs text-slate-400">{detailInterview.focusDomain}</p>
              </div>
              <span className="text-2xl font-black text-emerald-300">
                {detailInterview.evaluation.overallScore}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">Technical Knowledge</span>
                <span className="font-bold text-white text-sm">
                  {detailInterview.evaluation.technicalKnowledge} / 5
                </span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">Problem-Solving</span>
                <span className="font-bold text-white text-sm">
                  {detailInterview.evaluation.problemSolving} / 5
                </span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">Communication</span>
                <span className="font-bold text-white text-sm">
                  {detailInterview.evaluation.communication} / 5
                </span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">Project Understanding</span>
                <span className="font-bold text-white text-sm">
                  {detailInterview.evaluation.projectUnderstanding} / 5
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <h5 className="text-xs font-bold text-emerald-400 mb-1">Demonstrated Strengths</h5>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {detailInterview.evaluation.strengths}
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <h5 className="text-xs font-bold text-amber-400 mb-1">Areas for Improvement</h5>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {detailInterview.evaluation.improvements}
                </p>
              </div>

              {detailInterview.evaluation.privateNotes && (
                <div className="p-3 bg-slate-950 rounded-xl border border-amber-500/30">
                  <h5 className="text-xs font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Private Interviewer Notes
                  </h5>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {detailInterview.evaluation.privateNotes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL 5: Accept Session Modal (Existing) ────────────────────────────── */}
      <Modal
        open={Boolean(activeModalRequest)}
        onClose={() => setActiveModalRequest(null)}
        title="Schedule Mentorship Session"
        size="md"
      >
        {activeModalRequest && (
          <div className="space-y-4 text-sm text-slate-300">
            <p>
              Accepting inquiry from{' '}
              <span className="font-bold text-white">
                {activeModalRequest.student?.fullName || activeModalRequest.name}
              </span>{' '}
              for guidance in{' '}
              <span className="text-orange-300 font-semibold font-mono">
                {activeModalRequest.focusSkill || activeModalRequest.skill}
              </span>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Proposed Call / Advisory Date & Time
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

      {/* ── MODAL 6: Post Referral Modal (Existing) ─────────────────────────────── */}
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
