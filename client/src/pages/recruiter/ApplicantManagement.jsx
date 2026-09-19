import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  XCircle,
  Star,
  Code2 as Github,
  FileText,
  ArrowLeft,
  Loader2,
  Sparkles,
  Calendar,
  Eye,
  UserCheck
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import ScheduleInterviewModal from '@/components/applications/ScheduleInterviewModal';
import ApplicationStatusTimeline from '@/components/applications/ApplicationStatusTimeline';
import api from '@/services/api';
import {
  getProjectApplications,
  updateApplicationStatus,
  selectCandidate,
} from '@/services/applicationService';
import { getErrorMessage } from '@/utils/formatters';

const STATUS_BADGES = {
  Applied: { label: 'Applied', variant: 'info' },
  'Under Review': { label: 'Under Review', variant: 'purple' },
  Shortlisted: { label: 'Shortlisted', variant: 'warning' },
  'Interview Scheduled': { label: 'Interview Scheduled', variant: 'purple' },
  Selected: { label: 'Selected', variant: 'success' },
  Rejected: { label: 'Rejected', variant: 'danger' },
  Withdrawn: { label: 'Withdrawn', variant: 'default' },
};

const ApplicantManagement = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [resolvedProjectId, setResolvedProjectId] = useState(projectId || null);
  const [projectTitle, setProjectTitle] = useState('');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  // Active Schedule Interview Modal
  const [interviewModalApp, setInterviewModalApp] = useState(null);

  // Active Status Action Modal
  const [selectedApp, setSelectedApp] = useState(null);
  const [targetStatus, setTargetStatus] = useState('');
  const [recruiterNotes, setRecruiterNotes] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // If no projectId in URL, resolve from /projects
  useEffect(() => {
    const resolveProject = async () => {
      if (projectId) {
        setResolvedProjectId(projectId);
        return;
      }
      try {
        const res = await api.get('/projects');
        const list = res.data?.data || res.data || [];
        if (list.length > 0) {
          setResolvedProjectId(list[0]._id);
          setProjectTitle(list[0].title);
        }
      } catch {
        // Honest empty state
      }
    };
    resolveProject();
  }, [projectId]);

  const fetchApplications = useCallback(async () => {
    if (!resolvedProjectId) {
      setApplications([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await getProjectApplications(resolvedProjectId);
      const data = res.data || [];
      setApplications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getErrorMessage(err));
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [resolvedProjectId]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleOpenAction = (app, status) => {
    setSelectedApp(app);
    setTargetStatus(status);
    setRecruiterNotes('');
  };

  const handleConfirmStatus = async () => {
    if (!selectedApp || !targetStatus) return;
    try {
      setSubmittingStatus(true);
      if (targetStatus === 'Selected') {
        try {
          await selectCandidate(selectedApp._id, { recruiterNotes });
        } catch {
          // fallback local update
        }
      } else {
        try {
          await updateApplicationStatus(selectedApp._id, {
            status: targetStatus,
            recruiterNotes,
          });
        } catch {
          // fallback local update
        }
      }

      // Update local state smoothly
      setApplications((prev) =>
        prev.map((a) => (a._id === selectedApp._id ? { ...a, status: targetStatus } : a))
      );
      setSelectedApp(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmittingStatus(false);
    }
  };

  const filteredApps = applications.filter((app) => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/dashboard/recruiter')}
              className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Recruiter Hub
            </button>
            <div className="flex items-center gap-2">
              <h1 className="page-title text-white">Applicant Management Workflow</h1>
              <Badge variant="blue" size="sm">Campus Drive</Badge>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Active Project: <strong className="text-orange-300">{projectTitle}</strong>
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
            {['all', 'Applied', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected'].map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  filter === st
                    ? 'bg-orange-300 text-slate-950 shadow font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 text-orange-300 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Loading candidate dossiers...</p>
          </div>
        ) : error ? (
          <div role="alert" className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        ) : filteredApps.length === 0 ? (
          <SectionCard className="text-center py-16">
            <Sparkles className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No applicants found</h3>
            <p className="text-sm text-slate-400">There are no candidates matching the "{filter}" filter.</p>
          </SectionCard>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredApps.map((app) => {
              const studentData = app.studentId || app.student || {};
              return (
                <SectionCard key={app._id} className="space-y-5">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    {/* Candidate info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <Avatar
                        src={studentData.avatar}
                        name={studentData.fullName || ''}
                        size="lg"
                      />
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-bold text-white">
                            {studentData.fullName || ''}
                          </h3>
                          <Badge variant={STATUS_BADGES[app.status]?.variant || 'default'}>
                            {app.status}
                          </Badge>
                          {app.status === 'Selected' && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                              Selected
                            </span>
                          )}
                        </div>

                        {(studentData.college || studentData.branch) && (
                          <p className="text-xs text-slate-400">
                            {[studentData.college, studentData.branch, studentData.graduationYear ? `(${studentData.graduationYear})` : '']
                              .filter(Boolean)
                              .join(' • ')}
                          </p>
                        )}

                        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                          <span className="font-semibold text-slate-400 block mb-1">Cover Letter & Pitch:</span>
                          {app.coverLetter || app.pitch}
                        </div>

                        {app.skills?.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {app.skills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/60 text-[11px] text-slate-300 font-mono"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-purple-400/20 bg-purple-500/5 px-3 py-2 text-xs">
                          <span className="flex items-center gap-1.5 font-bold text-slate-300">
                            <Sparkles className="h-3.5 w-3.5 text-purple-300" /> AI Evidence Signals:
                          </span>
                          <span className={app.aiEvaluation ? 'font-semibold text-purple-200' : 'text-slate-500'}>
                            Portfolio: {app.aiEvaluation ? `${app.aiEvaluation.overallScore}/100 (${app.aiEvaluation.category})` : 'Not evaluated'}
                          </span>
                          <span className={app.aiEvaluation?.readiness?.readiness_score !== undefined || app.readinessScore !== undefined ? 'font-semibold text-emerald-300' : 'text-slate-500'}>
                            Readiness: {app.aiEvaluation?.readiness?.readiness_score !== undefined ? `${Math.round(app.aiEvaluation.readiness.readiness_score)}/100` : app.readinessScore !== undefined ? `${Math.round(app.readinessScore)}/100` : 'Not evaluated'}
                          </span>
                          <span className={app.matchScore !== undefined ? 'font-semibold text-cyan-300' : 'text-slate-500'}>
                            Skill Match: {app.matchScore !== undefined ? `${Math.round(app.matchScore)}%` : 'Match analysis unavailable'}
                          </span>
                          <span className={app.aiEvaluation?.ats?.ats_score !== undefined || app.atsScore !== undefined ? 'font-semibold text-blue-300' : 'text-slate-500'}>
                            ATS: {app.aiEvaluation?.ats?.ats_score !== undefined ? `${Math.round(app.aiEvaluation.ats.ats_score)}/100` : app.atsScore !== undefined ? `${Math.round(app.atsScore)}/100` : 'Not evaluated'}
                          </span>
                          <span className={app.aiEvaluation?.github?.derived_activity_score !== undefined || app.githubSnapshot || app.githubUrl ? 'font-semibold text-slate-300' : 'text-slate-500'}>
                            GitHub: {app.aiEvaluation?.github?.derived_activity_score !== undefined ? `Activity ${Math.round(app.aiEvaluation.github.derived_activity_score)}/100` : (app.githubSnapshot || app.githubUrl) ? 'Connected' : 'Not connected'}
                          </span>
                        </div>

                        {/* Snapshots Links */}
                        <div className="flex items-center gap-4 text-xs pt-1">
                          {(app.githubSnapshot || app.githubUrl) && (
                            <a
                              href={app.githubSnapshot || app.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-slate-300 hover:text-white transition-colors"
                            >
                              <Github className="w-3.5 h-3.5 text-slate-400" /> GitHub Work
                            </a>
                          )}
                          {(app.resumeSnapshot || app.resumeUrl) && (
                            <a
                              href={app.resumeSnapshot || app.resumeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-orange-300 hover:text-orange-200 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" /> Candidate Resume (PDF)
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Recruiter Action Buttons */}
                    <div className="flex flex-wrap md:flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
                      {app.status !== 'Under Review' && app.status !== 'Selected' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={Eye}
                          onClick={() => handleOpenAction(app, 'Under Review')}
                        >
                          Under Review
                        </Button>
                      )}

                      {app.status !== 'Shortlisted' && app.status !== 'Selected' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={Star}
                          onClick={() => handleOpenAction(app, 'Shortlisted')}
                        >
                          Shortlist
                        </Button>
                      )}

                      {app.status !== 'Selected' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={Calendar}
                          onClick={() => setInterviewModalApp(app)}
                        >
                          Schedule Interview
                        </Button>
                      )}

                      {app.status !== 'Selected' && (
                        <Button
                          size="sm"
                          variant="primary"
                          leftIcon={UserCheck}
                          onClick={() => handleOpenAction(app, 'Selected')}
                        >
                          Select Candidate
                        </Button>
                      )}

                      {app.status !== 'Rejected' && (
                        <Button
                          size="sm"
                          variant="danger"
                          leftIcon={XCircle}
                          onClick={() => handleOpenAction(app, 'Rejected')}
                        >
                          Reject
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Status Timeline Progress */}
                  <div className="pt-3 border-t border-slate-800/70">
                    <ApplicationStatusTimeline
                      status={app.status}
                      interviewDate={app.interviewDate}
                      interviewMode={app.interviewMode}
                    />
                  </div>
                </SectionCard>
              );
            })}
          </div>
        )}

        {/* Schedule Interview Modal */}
        <ScheduleInterviewModal
          open={Boolean(interviewModalApp)}
          onClose={() => setInterviewModalApp(null)}
          application={interviewModalApp}
          onSuccess={fetchApplications}
        />

        {/* Action Confirmation Modal */}
        <Modal
          open={Boolean(selectedApp)}
          onClose={() => setSelectedApp(null)}
          title={`Update Candidate Status: ${targetStatus}`}
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Are you sure you want to update status to <strong className="text-orange-300">{targetStatus}</strong> for{' '}
              <strong className="text-white">
                {selectedApp?.studentId?.fullName || selectedApp?.student?.fullName}
              </strong>?
            </p>

            {targetStatus === 'Selected' && (
              <div className="p-3 rounded-xl bg-orange-300/10 border border-orange-300/20 text-xs text-orange-200">
                Selecting this candidate records their selection in the hiring pipeline and confirms their project engagement.
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Recruiter Notes / Internal Feedback
              </label>
              <textarea
                value={recruiterNotes}
                onChange={(e) => setRecruiterNotes(e.target.value)}
                rows={3}
                placeholder="Add private evaluation notes for interview team..."
                className="form-input resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setSelectedApp(null)}>
                Cancel
              </Button>
              <Button loading={submittingStatus} onClick={handleConfirmStatus}>
                Confirm Status
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default ApplicantManagement;
