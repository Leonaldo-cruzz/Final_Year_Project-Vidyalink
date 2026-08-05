import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, FileText, Code2 as Github, Ban, Calendar, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ApplicationStatusTimeline from '@/components/applications/ApplicationStatusTimeline';
import { getStudentApplications, withdrawApplication } from '@/services/applicationService';
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

const StudentApplications = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [withdrawingId, setWithdrawingId] = useState(null);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await getStudentApplications();
      setApplications(res.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleWithdraw = async (appId) => {
    if (!window.confirm('Are you sure you want to withdraw this application?')) return;
    try {
      setWithdrawingId(appId);
      await withdrawApplication(appId);
      await fetchApplications();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setWithdrawingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white">My Project Applications</h1>
          <p className="text-sm text-slate-400">Track your application pipeline, scheduled interviews, and selection status in real-time.</p>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Loading your applications...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        ) : applications.length === 0 ? (
          <SectionCard className="text-center py-16">
            <Send className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Applications Yet</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
              Browse the live project marketplace and apply for opportunities that match your skills.
            </p>
            <Button onClick={() => navigate('/projects')}>Explore Projects</Button>
          </SectionCard>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const projectData = app.projectOpportunityId || app.project || {};
              const recruiterData = app.recruiterId || {};

              return (
                <SectionCard key={app._id} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-bold text-white">{projectData.title || 'Project'}</h3>
                        <Badge variant={STATUS_BADGES[app.status]?.variant || 'default'}>
                          {app.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400">
                        {projectData.company || 'Company'} • {projectData.domain || 'Domain'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {app.status === 'Selected' && (
                        <Button size="sm" onClick={() => navigate('/workspaces')}>
                          Open Workspace
                        </Button>
                      )}

                      {app.status !== 'Selected' && app.status !== 'Withdrawn' && app.status !== 'Rejected' && (
                        <Button
                          size="sm"
                          variant="danger"
                          leftIcon={Ban}
                          loading={withdrawingId === app._id}
                          onClick={() => handleWithdraw(app._id)}
                        >
                          Withdraw
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Application Details */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-2">
                    <div>
                      <span className="font-semibold text-slate-400 block mb-1">Your Cover Letter / Pitch:</span>
                      <p className="whitespace-pre-line">{app.coverLetter || app.pitch}</p>
                    </div>

                    {app.recruiterNotes && (
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-purple-300 font-medium">
                        <strong>Recruiter Notes:</strong> "{app.recruiterNotes}"
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                      {(app.githubSnapshot || app.githubUrl) && (
                        <a
                          href={app.githubSnapshot || app.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
                        >
                          <Github className="w-3.5 h-3.5" /> GitHub Profile
                        </a>
                      )}
                      {(app.resumeSnapshot || app.resumeUrl) && (
                        <a
                          href={app.resumeSnapshot || app.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                        >
                          <FileText className="w-3.5 h-3.5" /> Resume Link
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Timeline Tracker */}
                  <div className="pt-2">
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
      </div>
    </DashboardLayout>
  );
};

export default StudentApplications;
