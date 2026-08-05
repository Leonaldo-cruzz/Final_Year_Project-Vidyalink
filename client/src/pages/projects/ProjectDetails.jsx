import React, { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Code2 as Github, Edit3, ExternalLink, FileText, Image as ImageIcon, Users } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import DashboardLayout from '@/layouts/DashboardLayout';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { getProjectById } from '@/services/projectService';
import { formatDate, getErrorMessage } from '@/utils/formatters';
import { FullPageSpinner } from '@/components/ui/Spinner';

const ProjectDetails = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [project, setProject] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProject = async () => {
      try {
        const response = await getProjectById(projectId);
        setProject(response.data);
      } catch (requestError) {
        setError(getErrorMessage(requestError, 'Unable to load project'));
      }
    };
    loadProject();
  }, [projectId]);

  if (!project && !error) return <FullPageSpinner message="Loading project details…" />;
  if (!project) return <DashboardLayout><div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-400">{error}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        {location.state?.notice && <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{location.state.notice}</div>}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <button type="button" onClick={() => navigate('/projects')} className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Back to portfolio</button>
            <div className="flex flex-wrap items-center gap-2"><Badge variant="blue" size="sm">{project.category}</Badge><Badge variant={project.verificationStatus === 'Verified' ? 'emerald' : project.verificationStatus === 'Rejected' ? 'rose' : 'amber'} size="sm">{project.verificationStatus}</Badge></div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white">{project.title}</h1>
            <p className="mt-2 max-w-3xl text-base text-slate-400">{project.shortDescription}</p>
          </div>
          <Button variant="secondary" leftIcon={Edit3} onClick={() => navigate(`/projects/${projectId}/edit`)}>Edit Project</Button>
        </div>

        <Card className="overflow-hidden">
          {project.screenshots?.length ? <div className="grid grid-cols-1 gap-px bg-slate-800 sm:grid-cols-2">{project.screenshots.map((screenshot) => <img key={screenshot} src={screenshot} alt={`${project.title} screenshot`} className="aspect-video w-full bg-slate-950 object-cover" />)}</div> : <div className="flex h-48 items-center justify-center bg-gradient-to-br from-blue-950 via-slate-900 to-purple-950"><ImageIcon className="h-12 w-12 text-blue-300/40" /></div>}
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
            <div className="flex items-center gap-3 text-sm text-slate-300"><CalendarDays className="h-4 w-4 text-blue-400" /><span>{formatDate(project.startDate)} – {formatDate(project.endDate)}</span></div>
            <div className="flex items-center gap-3 text-sm text-slate-300"><FileText className="h-4 w-4 text-blue-400" /><span>{project.projectStatus}</span></div>
            <div className="flex items-center gap-3 text-sm text-slate-300"><Users className="h-4 w-4 text-blue-400" /><span>{project.teamMembers?.length || 0} team member(s)</span></div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          <Card className="p-6"><h2 className="text-base font-bold text-white">About this project</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-300">{project.detailedDescription}</p></Card>
          <div className="space-y-6">
            <Card className="p-5"><h2 className="text-base font-bold text-white">Technologies</h2><div className="mt-4 flex flex-wrap gap-2">{project.technologies?.map((technology) => <span key={technology} className="rounded-lg border border-slate-700 bg-slate-800/70 px-2.5 py-1.5 text-xs text-slate-300">{technology}</span>)}</div></Card>
            {project.teamMembers?.length > 0 && <Card className="p-5"><h2 className="text-base font-bold text-white">Team members</h2><ul className="mt-3 space-y-2 text-sm text-slate-300">{project.teamMembers.map((member) => <li key={member} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-blue-400" />{member}</li>)}</ul></Card>}
          </div>
        </div>

        <Card className="p-5"><h2 className="text-base font-bold text-white">Project links</h2><div className="mt-4 flex flex-wrap gap-3">{project.githubRepository && <a href={project.githubRepository} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-blue-500/50"><Github className="h-4 w-4" /> GitHub Repository</a>}{project.liveDeployment && <a href={project.liveDeployment} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-blue-500/50"><ExternalLink className="h-4 w-4" /> Live Deployment</a>}{project.demoVideo && <a href={project.demoVideo} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-blue-500/50"><ExternalLink className="h-4 w-4" /> Demo Video</a>}{project.documentationUrl && <a href={project.documentationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-blue-500/50"><FileText className="h-4 w-4" /> Documentation</a>}{!project.githubRepository && !project.liveDeployment && !project.demoVideo && !project.documentationUrl && <p className="text-sm text-slate-500">No external links added.</p>}</div></Card>
      </div>
    </DashboardLayout>
  );
};

export default ProjectDetails;
