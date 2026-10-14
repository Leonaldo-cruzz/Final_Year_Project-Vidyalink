import React from 'react';
import {
  CheckCircle2,
  Code2 as Github,
  ExternalLink,
  Eye,
  FilePenLine,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Star,
  Trash2,
  WifiOff,
  XCircle,
} from 'lucide-react';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { formatDate } from '@/utils/formatters';

const STATUS_VARIANTS = {
  Completed: 'emerald',
  'In Progress': 'blue',
  Prototype: 'amber',
  Archived: 'slate',
};

const VERIFICATION_VARIANTS = {
  Verified: 'emerald',
  Pending: 'amber',
  Rejected: 'rose',
};

// Deployment status visual config
const DEPLOYMENT_CONFIG = {
  not_provided: null, // hidden
  pending:      { icon: Loader2,       text: 'Checking…',   cls: 'text-slate-400 animate-spin' },
  reachable:    { icon: CheckCircle2,  text: 'Live',         cls: 'text-emerald-400' },
  unreachable:  { icon: WifiOff,       text: 'Unreachable',  cls: 'text-rose-400' },
  failed:       { icon: XCircle,       text: 'Check failed', cls: 'text-slate-500' },
};

const ProjectCard = ({ project, onView, onEdit, onDelete, onToggleFeatured }) => {
  const screenshot = project.screenshots?.[0];
  const description = project.shortDescription || project.description;
  const githubUrl = project.githubRepository || project.github;
  const demoUrl = project.liveDeployment || project.demo;
  const deploymentCfg = DEPLOYMENT_CONFIG[project.deploymentStatus] || null;

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:border-orange-300/40">
      <div className="relative aspect-[16/9] bg-slate-800">
        {screenshot ? (
          <img
            src={screenshot}
            alt={`${project.title} project`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="h-10 w-10 text-blue-300/40" />
          </div>
        )}
        {onToggleFeatured && (
          <button
            type="button"
            onClick={() => onToggleFeatured?.(project)}
            className={`absolute right-3 top-3 rounded-md border p-2 ${
              project.featured
                ? 'border-amber-400/50 bg-amber-500/20 text-amber-300'
                : 'border-slate-700 bg-slate-950/80 text-slate-400 hover:text-amber-300'
            }`}
            aria-label={project.featured ? 'Remove featured flag' : 'Mark project as featured'}
          >
            <Star className="h-4 w-4" fill={project.featured ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {project.projectStatus && (
            <Badge variant={STATUS_VARIANTS[project.projectStatus] || 'slate'} size="sm">
              {project.projectStatus}
            </Badge>
          )}
          {project.verificationStatus && (
            <Badge variant={VERIFICATION_VARIANTS[project.verificationStatus] || 'slate'} size="sm">
              {project.verificationStatus}
            </Badge>
          )}
          {project.aiScore !== undefined && project.aiScore !== null && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40"
              title="Verified AI Evaluation Score"
            >
              <Sparkles className="h-3 w-3 text-purple-400" />
              AI Score: {project.aiScore}/100
            </span>
          )}
          {/* GitHub source indicator — non-intrusive, not a verification badge */}
          {project.githubSource === 'github_sync' && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 border border-orange-300/30 text-orange-300"
              title={project.githubSyncStatus === 'deleted' ? 'Repository no longer found on GitHub — portfolio record preserved' : 'Imported from GitHub sync'}
            >
              <Github className="h-2.5 w-2.5" />
              {project.githubSyncStatus === 'deleted' ? 'GitHub (deleted)' : 'GitHub Synced'}
            </span>
          )}
          {deploymentCfg && (
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-semibold ${deploymentCfg.cls}`}
              title={`Deployment: ${project.deploymentStatus}`}
            >
              <deploymentCfg.icon className={`h-3 w-3 ${project.deploymentStatus === 'pending' ? 'animate-spin' : ''}`} />
              {deploymentCfg.text}
            </span>
          )}
        </div>

        <h3 className="line-clamp-2 text-lg font-bold leading-snug text-white">{project.title}</h3>

        {project.userId && (project.userId.fullName || project.userId.branch) && (
          <div className="mt-1 mb-2 text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
            {project.userId.fullName && (
              <span className="font-semibold text-slate-200">{project.userId.fullName}</span>
            )}
            {(project.userId.branch || project.userId.graduationYear) && (
              <span className="text-slate-500">•</span>
            )}
            {project.userId.branch && (
              <span className="text-slate-300">{project.userId.branch}</span>
            )}
            {project.userId.graduationYear && (
              <span className="text-slate-400">Class of {project.userId.graduationYear}</span>
            )}
          </div>
        )}

        {description && (
          <p className="mt-2 line-clamp-3 min-h-[3.75rem] text-sm leading-relaxed text-slate-400">
            {description}
          </p>
        )}

        {Array.isArray(project.technologies) && project.technologies.length > 0 && (
          <div className="mt-4 flex min-h-7 flex-wrap gap-1.5">
            {project.technologies.slice(0, 5).map((technology) => (
              <span
                key={technology}
                className="rounded-md border border-slate-700/70 bg-slate-800/70 px-2 py-1 text-[11px] font-medium text-slate-300"
              >
                {technology}
              </span>
            ))}
            {project.technologies.length > 5 && (
              <span className="px-1 py-1 text-[11px] text-slate-500">
                +{project.technologies.length - 5}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-slate-800/70 pt-3 text-[11px] text-slate-500">
          <span>{project.category || ''}</span>
          {(project.updatedAt || project.createdAt) && (
            <span>{formatDate(project.updatedAt || project.createdAt)}</span>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          <Button
            type="button"
            variant="secondary"
            size="xs"
            leftIcon={Eye}
            onClick={() => onView(project)}
          >
            Details
          </Button>
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Open GitHub repository"
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-700 px-2.5 text-[11px] text-slate-300 hover:border-blue-500/50 hover:text-white"
            >
              <Github className="h-3.5 w-3.5" /> GitHub
            </a>
          )}
          {demoUrl && (
            <a
              href={demoUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Open live deployment"
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-700 px-2.5 text-[11px] text-slate-300 hover:border-blue-500/50 hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Live
            </a>
          )}
          <div className="ml-auto flex gap-1">
            {onEdit && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                leftIcon={FilePenLine}
                onClick={() => onEdit(project)}
                aria-label="Edit project"
              />
            )}
            {onDelete && (
              <Button
                type="button"
                variant="danger"
                size="xs"
                leftIcon={Trash2}
                onClick={() => onDelete(project)}
                aria-label="Delete project"
              />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ProjectCard;
