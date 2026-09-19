import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, CalendarDays, CheckCircle2, Code2 as Github, Edit3,
  ExternalLink, FileText, Image as ImageIcon, Loader2, RefreshCw,
  Users, WifiOff, XCircle,
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import DashboardLayout from '@/layouts/DashboardLayout';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { getProjectById, verifyDeployment } from '@/services/projectService';
import { formatDate, getErrorMessage } from '@/utils/formatters';
import { FullPageSpinner } from '@/components/ui/Spinner';

// ── Deployment status display config ─────────────────────────────────────────
const DEPLOY_STATUS = {
  not_provided: {
    icon: null,
    label: 'Not provided',
    desc: 'No live deployment URL has been added to this project.',
    cls: 'text-slate-500',
    badgeCls: '',
  },
  pending: {
    icon: Loader2,
    label: 'Checking…',
    desc: 'A live URL reachability check is in progress.',
    cls: 'text-slate-400',
    badgeCls: 'animate-spin',
  },
  reachable: {
    icon: CheckCircle2,
    label: 'Live & reachable',
    desc: 'The deployment URL responded successfully.',
    cls: 'text-emerald-400',
    badgeCls: '',
  },
  unreachable: {
    icon: WifiOff,
    label: 'Unreachable',
    desc: 'The deployment URL did not respond with a success status.',
    cls: 'text-rose-400',
    badgeCls: '',
  },
  failed: {
    icon: XCircle,
    label: 'Verification failed',
    desc: 'The check could not complete — bad URL, timeout, or network issue.',
    cls: 'text-slate-500',
    badgeCls: '',
  },
};

const ProjectDetails = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [project, setProject] = useState(null);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const loadProject = useCallback(async () => {
    try {
      const response = await getProjectById(projectId);
      setProject(response.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to load project'));
    }
  }, [projectId]);

  useEffect(() => { loadProject(); }, [loadProject]);

  const handleVerifyDeployment = async () => {
    setVerifying(true);
    setVerifyError('');
    try {
      const response = await verifyDeployment(projectId);
      setProject(response.data);
    } catch (requestError) {
      setVerifyError(getErrorMessage(requestError, 'Verification request failed.'));
    } finally {
      setVerifying(false);
    }
  };

  if (!project && !error) return <FullPageSpinner message="Loading project details…" />;
  if (!project) return (
    <DashboardLayout>
      <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-400">
        {error}
      </div>
    </DashboardLayout>
  );

  const deployStatus = DEPLOY_STATUS[project.deploymentStatus] || DEPLOY_STATUS.not_provided;
  const DeployIcon = deployStatus.icon;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        {location.state?.notice && (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {location.state.notice}
          </div>
        )}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to portfolio
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="blue" size="sm">{project.category}</Badge>
              <Badge
                variant={project.verificationStatus === 'Verified' ? 'emerald' : project.verificationStatus === 'Rejected' ? 'rose' : 'amber'}
                size="sm"
              >
                {project.verificationStatus}
              </Badge>
            </div>
            <h1 className="page-title mt-3 text-white">{project.title}</h1>
            <p className="mt-2 max-w-3xl text-base text-slate-400">{project.shortDescription}</p>
          </div>
          <Button variant="secondary" leftIcon={Edit3} onClick={() => navigate(`/projects/${projectId}/edit`)}>
            Edit Project
          </Button>
        </div>

        <Card className="overflow-hidden">
          {project.screenshots?.length ? (
            <div className="grid grid-cols-1 gap-px bg-slate-800 sm:grid-cols-2">
              {project.screenshots.map((screenshot) => (
                <img
                  key={screenshot}
                  src={screenshot}
                  alt={`${project.title} screenshot`}
                  className="aspect-video w-full bg-slate-950 object-cover"
                />
              ))}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center bg-slate-800">
              <ImageIcon className="h-12 w-12 text-orange-300/40" />
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <CalendarDays className="h-4 w-4 text-orange-300" />
              <span>{formatDate(project.startDate)} – {formatDate(project.endDate)}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <FileText className="h-4 w-4 text-orange-300" />
              <span>{project.projectStatus}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Users className="h-4 w-4 text-orange-300" />
              <span>{project.teamMembers?.length || 0} team member(s)</span>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          <Card className="p-6">
            <h2 className="text-base font-bold text-white">About this project</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-300">
              {project.detailedDescription}
            </p>
          </Card>

          <div className="space-y-6">
            <Card className="p-5">
              <h2 className="text-base font-bold text-white">Technologies</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.technologies?.map((technology) => (
                  <span
                    key={technology}
                    className="rounded-lg border border-slate-700 bg-slate-800/70 px-2.5 py-1.5 text-xs text-slate-300"
                  >
                    {technology}
                  </span>
                ))}
              </div>
            </Card>

            {project.teamMembers?.length > 0 && (
              <Card className="p-5">
                <h2 className="text-base font-bold text-white">Team members</h2>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {project.teamMembers.map((member) => (
                    <li key={member} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                      {member}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>

        {/* Project Links */}
        <Card className="p-5">
          <h2 className="text-base font-bold text-white">Project links</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {project.githubRepository && (
              <a href={project.githubRepository} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-blue-500/50">
                <Github className="h-4 w-4" /> GitHub Repository
              </a>
            )}
            {project.liveDeployment && (
              <a href={project.liveDeployment} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-blue-500/50">
                <ExternalLink className="h-4 w-4" /> Live Deployment
              </a>
            )}
            {project.demoVideo && (
              <a href={project.demoVideo} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-blue-500/50">
                <ExternalLink className="h-4 w-4" /> Demo Video
              </a>
            )}
            {project.documentationUrl && (
              <a href={project.documentationUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-blue-500/50">
                <FileText className="h-4 w-4" /> Documentation
              </a>
            )}
            {!project.githubRepository && !project.liveDeployment && !project.demoVideo && !project.documentationUrl && (
              <p className="text-sm text-slate-500">No external links added.</p>
            )}
          </div>
        </Card>

        {/* Live Deployment Verification */}
        <Card className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Live Deployment Verification</h2>
              <p className="mt-1 text-xs text-slate-500">
                Verify that your deployment URL is publicly reachable. This performs a real HTTP check.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={verifying ? Loader2 : RefreshCw}
              loading={verifying}
              onClick={handleVerifyDeployment}
              disabled={verifying}
            >
              {verifying ? 'Checking…' : 'Check Deployment'}
            </Button>
          </div>

          {verifyError && (
            <div role="alert" className="mt-4 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {verifyError}
            </div>
          )}

          <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            {DeployIcon ? (
              <DeployIcon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${deployStatus.cls} ${deployStatus.badgeCls}`} />
            ) : (
              <span className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border border-slate-700" />
            )}
            <div>
              <p className={`text-sm font-semibold ${deployStatus.cls}`}>{deployStatus.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{deployStatus.desc}</p>
              {project.liveDeployment && (
                <p className="mt-1.5 break-all text-[11px] font-mono text-slate-400">{project.liveDeployment}</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProjectDetails;
