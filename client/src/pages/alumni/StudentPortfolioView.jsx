import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import alumniService from '@/services/alumniService';
import { useAuth } from '@/context/AuthContext';

import EndorseSkillModal from '@/components/alumni/EndorseSkillModal';
import ScheduleMockInterviewModal from '@/components/alumni/ScheduleMockInterviewModal';
import CreateReferralModal from '@/components/alumni/CreateReferralModal';
import MentorshipRequestModal from '@/components/alumni/MentorshipRequestModal';

import {
  Sparkles, CheckCircle2, Award, FolderKanban, Code2 as Github,
  Link, Globe, Calendar, Share2, Video, MessageSquare,
  ArrowLeft, ExternalLink, Star, ShieldCheck, AlertTriangle,
} from 'lucide-react';

const StudentPortfolioView = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Modals
  const [showEndorseModal, setShowEndorseModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showMentorshipModal, setShowMentorshipModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPortfolio();
  }, [studentId]);

  const fetchPortfolio = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await alumniService.getStudentPortfolio(studentId);
      setData(res);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load portfolio details');
    } finally {
      setLoading(false);
    }
  };

  const handleEndorseSubmit = async (payload) => {
    setActionLoading(true);
    try {
      await alumniService.createEndorsement(payload);
      setActionSuccess(`Successfully endorsed skill "${payload.skill}"!`);
      setTimeout(() => setActionSuccess(''), 4000);
      fetchPortfolio();
    } finally {
      setActionLoading(false);
    }
  };

  const handleReferralSubmit = async (payload) => {
    setActionLoading(true);
    try {
      await alumniService.createReferral(payload);
      setActionSuccess(`Successfully submitted referral for ${payload.company}!`);
      setTimeout(() => setActionSuccess(''), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleInterviewSubmit = async (interviewId, payload) => {
    setActionLoading(true);
    try {
      // First request/create interview directly
      await alumniService.requestMockInterview({
        alumniId: user._id,
        roleTarget: 'Technical Mock Interview',
        mode: payload.mode,
        scheduledDate: payload.scheduledDate,
        meetingLink: payload.meetingLink,
        location: payload.location,
        durationMinutes: payload.durationMinutes,
      });
      setActionSuccess('Mock interview scheduled and invitations dispatched!');
      setTimeout(() => setActionSuccess(''), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMentorshipSubmit = async (payload) => {
    setActionLoading(true);
    try {
      await alumniService.requestMentorship(payload);
      setActionSuccess('Mentorship invite submitted!');
      setTimeout(() => setActionSuccess(''), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 space-y-3 max-w-xl mx-auto text-center">
          <p>{error || 'Student portfolio not found'}</p>
          <Button variant="secondary" onClick={() => navigate('/alumni/students')}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Student Discovery
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const { student, skills, verifiedSkills, skillGaps, industryReadiness, portfolios, projects, certificates, githubSummary, endorsements } = data;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/alumni/students')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Student Search
          </button>
        </div>

        {/* Action success alert */}
        {actionSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            {actionSuccess}
          </div>
        )}

        {/* Hero Header Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/20 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <Avatar name={student.fullName} size="xl" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-white">{student.fullName}</h1>
                {portfolios.length > 0 && (
                  <Badge variant="emerald" size="sm">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Faculty Verified
                  </Badge>
                )}
              </div>

              <p className="text-slate-400 text-sm mt-1">
                {student.college} • {student.branch} {student.graduationYear ? `(Class of ${student.graduationYear})` : ''}
              </p>

              {student.bio && (
                <p className="text-slate-300 text-xs mt-2 max-w-2xl leading-relaxed">
                  {student.bio}
                </p>
              )}

              {/* Social / External Links */}
              <div className="flex items-center gap-3 mt-3">
                {student.githubUsername && (
                  <a
                    href={`https://github.com/${student.githubUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                  >
                    <Github className="w-3.5 h-3.5" /> github/{student.githubUsername}
                  </a>
                )}
                {student.linkedin && (
                  <a
                    href={student.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-blue-400 flex items-center gap-1 transition-colors"
                  >
                    <Link className="w-3.5 h-3.5" /> LinkedIn
                  </a>
                )}
                {student.portfolioWebsite && (
                  <a
                    href={student.portfolioWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" /> Portfolio
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap md:flex-col gap-2 flex-shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowEndorseModal(true)}
              className="shadow-lg shadow-amber-500/10"
            >
              <Award className="w-4 h-4 mr-1.5" /> Endorse Skill
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowReferralModal(true)}
            >
              <Share2 className="w-4 h-4 mr-1.5" /> Refer for Job
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInterviewModal(true)}
            >
              <Video className="w-4 h-4 mr-1.5" /> Schedule Mock Interview
            </Button>
          </div>
        </div>

        {/* AI Industry Readiness Scorecard & Skills Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Readiness Card */}
          <div className="lg:col-span-1 p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Sparkles className="w-4 h-4" /> AI Industry Readiness
              </span>
              <Badge variant={industryReadiness?.score >= 80 ? 'emerald' : 'amber'}>
                {industryReadiness?.status || 'MODERATE'}
              </Badge>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-white">{industryReadiness?.score || 72}%</span>
              <span className="text-xs text-slate-500">Recruiter Match Index</span>
            </div>

            {/* Strengths */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-[11px] font-bold uppercase text-slate-400">Verified Strengths</span>
              <ul className="space-y-1">
                {(industryReadiness?.strengths || []).map((st, i) => (
                  <li key={i} className="text-xs text-emerald-300 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>{st}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Skill Gaps */}
            {skillGaps?.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-bold uppercase text-slate-400">Potential Skill Gaps</span>
                <div className="flex flex-wrap gap-1.5">
                  {skillGaps.map((gap, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-amber-300 border border-amber-500/20 flex items-center gap-1"
                    >
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      {gap}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Skills Breakdown */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" /> Candidate Skill Graph
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Skills verified through faculty deliverables and alumni peer endorsements.
              </p>
            </div>

            {/* Verified Skills */}
            {verifiedSkills?.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-emerald-400">Faculty-Verified Skills</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {verifiedSkills.map((sk) => (
                    <span
                      key={sk}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Other Profile Skills */}
            <div>
              <span className="text-xs font-semibold text-slate-400">All Profile Skills</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {skills.map((sk) => (
                  <span
                    key={sk}
                    className="px-3 py-1 rounded-xl bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700 hover:border-amber-500/30 transition-colors"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            </div>

            {/* GitHub Summary */}
            {githubSummary && (
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Github className="w-5 h-5 text-slate-300" />
                  <div>
                    <p className="text-xs font-bold text-slate-200">GitHub: @{githubSummary.username}</p>
                    <p className="text-[11px] text-slate-400">
                      {githubSummary.publicRepos} Public Repositories • {githubSummary.totalStars} Stars Earned
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {(githubSummary.topLanguages || []).map((lang) => (
                    <span key={lang} className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Verified Portfolios & Deliverables */}
        <SectionCard
          title="Verified Portfolios & Academic Workspaces"
          subtitle="Signed academic deliverables evaluated by professors"
        >
          {portfolios.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No formal portfolio certificates issued yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {portfolios.map((port) => (
                <div
                  key={port._id}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/30 transition-all space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-100">{port.projectTitle}</h4>
                      <p className="text-xs text-slate-400">Verified by: {port.verifiedBy}</p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                      {port.certificateId}
                    </span>
                  </div>

                  {port.skillsVerified?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {port.skillsVerified.map((sk, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Issued: {new Date(port.issuedAt).toLocaleDateString()}</span>
                    <span className="font-mono text-[10px] truncate max-w-[150px]">{port.verificationHash?.slice(0, 16)}…</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Projects and Certificates */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Projects */}
          <SectionCard title="Projects" subtitle="Public and course projects">
            {projects.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No projects listed.</p>
            ) : (
              <div className="space-y-3">
                {projects.map((pr) => (
                  <div key={pr._id} className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-bold text-slate-200">{pr.title}</h4>
                      <Badge variant="blue" size="sm">{pr.status || 'ACTIVE'}</Badge>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{pr.description}</p>
                    <div className="flex items-center gap-3 pt-1 text-xs">
                      {pr.githubUrl && (
                        <a
                          href={pr.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          <Github className="w-3.5 h-3.5" /> Source Code
                        </a>
                      )}
                      {pr.liveUrl && (
                        <a
                          href={pr.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Live Demo
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Endorsements Given */}
          <SectionCard title="Alumni Endorsements" subtitle="Peer recommendations from industry graduates">
            {endorsements.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No endorsements recorded yet. Be the first to endorse!</p>
            ) : (
              <div className="space-y-3">
                {endorsements.map((en) => (
                  <div key={en._id} className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" /> {en.skill}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(en.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 italic">"{en.message || 'Highly capable engineer in this domain.'}"</p>
                    <p className="text-[11px] text-slate-500 font-semibold">— {en.alumniName}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Modals */}
        <EndorseSkillModal
          isOpen={showEndorseModal}
          onClose={() => setShowEndorseModal(false)}
          student={student}
          availableSkills={skills}
          onEndorse={handleEndorseSubmit}
          loading={actionLoading}
        />

        <CreateReferralModal
          isOpen={showReferralModal}
          onClose={() => setShowReferralModal(false)}
          student={student}
          onSubmit={handleReferralSubmit}
          loading={actionLoading}
        />

        <ScheduleMockInterviewModal
          isOpen={showInterviewModal}
          onClose={() => setShowInterviewModal(false)}
          interview={{ _id: 'new', student, roleTarget: 'Full Stack & System Architecture' }}
          onSchedule={handleInterviewSubmit}
          loading={actionLoading}
        />

        <MentorshipRequestModal
          isOpen={showMentorshipModal}
          onClose={() => setShowMentorshipModal(false)}
          alumni={{ _id: student._id, fullName: student.fullName, college: student.college }}
          onSubmit={handleMentorshipSubmit}
          loading={actionLoading}
        />
      </div>
    </DashboardLayout>
  );
};

export default StudentPortfolioView;
