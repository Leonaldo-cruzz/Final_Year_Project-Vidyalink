import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Bookmark, Briefcase, Building2,
  CheckCircle2, ArrowRight, Calendar, Loader2, Sparkles
} from 'lucide-react';

import DashboardLayout from '@/layouts/DashboardLayout';
import { StatCard, SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/constants';
import api from '@/services/api';
import { getRecruiterApplications } from '@/services/applicationService';

const STATUS_BADGES = {
  Applied: { label: 'Applied', variant: 'info' },
  'Under Review': { label: 'Under Review', variant: 'purple' },
  Shortlisted: { label: 'Shortlisted', variant: 'warning' },
  'Interview Scheduled': { label: 'Interview Scheduled', variant: 'purple' },
  Selected: { label: 'Selected', variant: 'success' },
  Rejected: { label: 'Rejected', variant: 'danger' },
  Withdrawn: { label: 'Withdrawn', variant: 'default' },
};

const RecruiterDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchRecruiterData = async () => {
      try {
        setLoading(true);
        // Run project list and all recruiter applications in parallel (2 calls, not N+1)
        const [projRes, appsRes] = await Promise.allSettled([
          api.get('/projects'),
          getRecruiterApplications(),
        ]);

        if (!isMounted) return;

        if (projRes.status === 'fulfilled') {
          const projList = projRes.value?.data?.data || projRes.value?.data || [];
          setProjects(Array.isArray(projList) ? projList : []);
        }

        if (appsRes.status === 'fulfilled') {
          const appsData = appsRes.value?.data || appsRes.value || [];
          setApplications(Array.isArray(appsData) ? appsData : []);
        } else {
          setApplications([]);
        }
      } catch (err) {
        if (isMounted) {
          setLoadError(
            err?.response?.data?.message || err?.message || 'Unable to load recruiter data. Please try again.'
          );
          setProjects([]);
          setApplications([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRecruiterData();

    return () => {
      isMounted = false;
    };
  }, []);

  const funnel = useMemo(() => {
    const applied = applications.filter((a) => a.status === 'Applied').length;
    const underReview = applications.filter((a) => a.status === 'Under Review').length;
    const shortlisted = applications.filter((a) => a.status === 'Shortlisted').length;
    const interviewing = applications.filter((a) => a.status === 'Interview Scheduled').length;
    const selected = applications.filter((a) => a.status === 'Selected').length;

    return { applied, underReview, shortlisted, interviewing, selected };
  }, [applications]);

  const handleAction = (msg) => {
    setToastMessage(msg);
    setSelectedCandidate(null);
    setTimeout(() => setToastMessage(''), 3500);
  };

  return (
    <DashboardLayout>
      {/* Recruiter Banner */}
      <div className="mb-6 rounded-xl border border-slate-800/80 bg-linear-to-r from-slate-900/90 via-slate-900/60 to-slate-950 p-5 sm:p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {user?.college && (
                <span className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-widest text-orange-300">
                  <Building2 className="h-3.5 w-3.5" /> {user.college}
                </span>
              )}
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">Campus Talent Acquisition Portal</span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-emerald-400 font-semibold">Verified Evidence Pipeline</span>
            </div>

            <h1 className="page-title text-white text-2xl sm:text-3xl font-extrabold">
              University Talent & Candidate Signal
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Welcome{user?.fullName ? `, ${user.fullName}` : ''}. Discover pre-verified academic talent, review authenticated project deliverables, and schedule campus interviews.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={Users}
              onClick={() => navigate('/recruiter/applicants')}
            >
              All Applicants ({applications.length})
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={Briefcase}
              onClick={() => navigate(ROUTES.CREATE_PROJECT)}
            >
              Post Opportunity
            </Button>
          </div>
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {loadError}
        </div>
      )}

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
          label="Total Applications"
          value={applications.length.toString()}
          icon={Users}
          color="emerald"
        />
        <StatCard
          label="Shortlisted Talent"
          value={funnel.shortlisted.toString()}
          icon={Bookmark}
          color="blue"
        />
        <StatCard
          label="Active Opportunities"
          value={projects.length.toString()}
          icon={Briefcase}
          color="amber"
        />
        <StatCard
          label="Interview Scheduled"
          value={funnel.interviewing.toString()}
          icon={Calendar}
          color="purple"
        />
      </div>

      {/* Real Talent Funnel Progression Banner */}
      <div className="mb-6 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
          <span className="font-extrabold uppercase tracking-wider text-slate-400">Campus Hiring Pipeline Status</span>
          <span className="text-orange-300 font-semibold">{applications.length} Total Profiles In Pipeline</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 text-center">
          {[
            { label: 'Applied', count: funnel.applied, tone: 'text-slate-200' },
            { label: 'Under Review', count: funnel.underReview, tone: 'text-purple-400' },
            { label: 'Shortlisted', count: funnel.shortlisted, tone: 'text-amber-400' },
            { label: 'Interviewing', count: funnel.interviewing, tone: 'text-blue-400' },
            { label: 'Selected / Offer', count: funnel.selected, tone: 'text-emerald-400' },
          ].map((st) => (
            <div key={st.label} className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <p className={`text-xl font-extrabold ${st.tone}`}>{st.count}</p>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{st.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Candidate List (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard
            title="Candidate Applications"
            subtitle="Genuine student applicants with verified deliverables and credentials"
            action={
              applications.length > 0 ? (
                <button
                  type="button"
                  onClick={() => navigate('/recruiter/applicants')}
                  className="text-xs font-semibold text-orange-300 hover:text-orange-200 flex items-center gap-1 transition-colors"
                >
                  Manage All <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : null
            }
          >
            {loading ? (
              <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-orange-300" /> Loading candidate records…
              </div>
            ) : applications.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Users className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-base font-bold text-white">No Candidate Applications Yet</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Student applications for your posted projects will appear here with verified academic evidence.
                </p>
                <Button size="sm" variant="secondary" onClick={() => navigate(ROUTES.CREATE_PROJECT)}>
                  Post Project Opportunity
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => {
                  const student = app.studentId || app.student || {};
                  return (
                    <div
                      key={app._id}
                      className="p-4 sm:p-5 rounded-xl bg-slate-950/75 border border-slate-800 space-y-3 transition-all hover:border-slate-700"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <Avatar name={student.fullName || ''} size="md" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">{student.fullName || ''}</h4>
                              <Badge variant={STATUS_BADGES[app.status]?.variant || 'default'} size="sm">
                                {app.status}
                              </Badge>
                            </div>
                            {(student.college || student.branch) && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                {[student.college, student.branch, student.graduationYear ? `Class of ${student.graduationYear}` : '']
                                  .filter(Boolean)
                                  .join(' • ')}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedCandidate(app)}
                          >
                            Review Details
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => navigate('/recruiter/applicants')}
                          >
                            Manage
                          </Button>
                        </div>
                      </div>

                      {(app.pitch || app.coverLetter) && (
                        <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                          {app.pitch || app.coverLetter}
                        </p>
                      )}

                      {app.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {app.skills.map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-purple-400/20 bg-purple-500/5 px-3 py-1.5 text-xs">
                        <span className="flex items-center gap-1 font-bold text-slate-300 text-[11px]">
                          <Sparkles className="h-3 w-3 text-purple-300" /> AI Signals:
                        </span>
                        <span className={app.aiEvaluation ? 'font-semibold text-purple-200 text-[11px]' : 'text-slate-500 text-[11px]'}>
                          Score: {app.aiEvaluation ? `${app.aiEvaluation.overallScore}/100` : 'Not evaluated'}
                        </span>
                        <span className={app.matchScore !== undefined ? 'font-semibold text-cyan-300 text-[11px]' : 'text-slate-500 text-[11px]'}>
                          Match: {app.matchScore !== undefined ? `${Math.round(app.matchScore)}%` : 'Unavailable'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right col: Requisitions & Quick Actions */}
        <div className="space-y-6">
          <SectionCard
            title="Active Requisitions"
            subtitle="Your open project opportunities"
            action={
              <button
                type="button"
                onClick={() => navigate(ROUTES.CREATE_PROJECT)}
                className="text-xs font-semibold text-orange-300 hover:text-orange-200"
              >
                + New
              </button>
            }
          >
            {projects.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <Briefcase className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">No active requisitions posted.</p>
                <Button size="sm" variant="ghost" onClick={() => navigate(ROUTES.CREATE_PROJECT)}>
                  Create Opportunity
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((req) => (
                  <div
                    key={req._id || req.id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-white truncate flex-1 mr-2">{req.title}</h5>
                      <Badge variant="emerald" size="sm">Active</Badge>
                    </div>
                    {req.domain && (
                      <p className="text-[11px] text-slate-400">{req.domain}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Direct Recruiter Actions">
            <div className="space-y-2.5">
              <Button
                className="w-full justify-start text-xs"
                variant="secondary"
                leftIcon={Users}
                onClick={() => navigate('/recruiter/applicants')}
              >
                Candidate Applicant Manager
              </Button>
              <Button
                className="w-full justify-start text-xs"
                variant="secondary"
                leftIcon={Briefcase}
                onClick={() => navigate(ROUTES.CREATE_PROJECT)}
              >
                Post New Opportunity
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Candidate Detail Modal */}
      <Modal
        open={Boolean(selectedCandidate)}
        onClose={() => setSelectedCandidate(null)}
        title="Candidate Application Review"
        size="md"
      >
        {selectedCandidate && (
          <div className="space-y-4 text-sm text-slate-300">
            <div>
              <p className="text-xs text-slate-400">Applicant Name</p>
              <p className="text-base font-bold text-white">
                {(selectedCandidate.studentId || selectedCandidate.student)?.fullName || ''}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {[(selectedCandidate.studentId || selectedCandidate.student)?.college,
                  (selectedCandidate.studentId || selectedCandidate.student)?.branch]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
            </div>

            {/* AI Evidence Signals */}
            <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-purple-400/20 bg-purple-500/5 p-3 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-slate-200">
                <Sparkles className="h-3.5 w-3.5 text-purple-300" /> AI Evidence Signals:
              </span>
              <span className={selectedCandidate.aiEvaluation ? 'font-semibold text-purple-200' : 'text-slate-500'}>
                Portfolio: {selectedCandidate.aiEvaluation ? `${selectedCandidate.aiEvaluation.overallScore}/100 (${selectedCandidate.aiEvaluation.category})` : 'Not evaluated'}
              </span>
              <span className={selectedCandidate.aiEvaluation?.readiness?.readiness_score !== undefined || selectedCandidate.readinessScore !== undefined ? 'font-semibold text-emerald-300' : 'text-slate-500'}>
                Readiness: {selectedCandidate.aiEvaluation?.readiness?.readiness_score !== undefined ? `${Math.round(selectedCandidate.aiEvaluation.readiness.readiness_score)}/100` : selectedCandidate.readinessScore !== undefined ? `${Math.round(selectedCandidate.readinessScore)}/100` : 'Not evaluated'}
              </span>
              <span className={selectedCandidate.matchScore !== undefined ? 'font-semibold text-cyan-300' : 'text-slate-500'}>
                Skill Match: {selectedCandidate.matchScore !== undefined ? `${Math.round(selectedCandidate.matchScore)}%` : 'Match analysis unavailable'}
              </span>
              <span className={selectedCandidate.aiEvaluation?.ats?.ats_score !== undefined || selectedCandidate.atsScore !== undefined ? 'font-semibold text-blue-300' : 'text-slate-500'}>
                ATS: {selectedCandidate.aiEvaluation?.ats?.ats_score !== undefined ? `${Math.round(selectedCandidate.aiEvaluation.ats.ats_score)}/100` : selectedCandidate.atsScore !== undefined ? `${Math.round(selectedCandidate.atsScore)}/100` : 'Not evaluated'}
              </span>
              <span className={selectedCandidate.aiEvaluation?.github?.derived_activity_score !== undefined || selectedCandidate.githubSnapshot || selectedCandidate.githubUrl ? 'font-semibold text-slate-300' : 'text-slate-500'}>
                GitHub: {selectedCandidate.aiEvaluation?.github?.derived_activity_score !== undefined ? `Activity ${Math.round(selectedCandidate.aiEvaluation.github.derived_activity_score)}/100` : (selectedCandidate.githubSnapshot || selectedCandidate.githubUrl) ? 'Connected' : 'Not connected'}
              </span>
            </div>

            {(selectedCandidate.pitch || selectedCandidate.coverLetter) && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Candidate Submission Notes
                </p>
                <p className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200">
                  {selectedCandidate.pitch || selectedCandidate.coverLetter}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <Button variant="ghost" onClick={() => setSelectedCandidate(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  handleAction('Navigating to full applicant management console.');
                  navigate('/recruiter/applicants');
                }}
              >
                Open Full Dossier
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
};

export default RecruiterDashboard;
