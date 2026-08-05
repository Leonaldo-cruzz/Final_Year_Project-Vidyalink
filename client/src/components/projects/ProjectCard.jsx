import React from 'react';
import { Code2 as Github, ExternalLink, Eye, FilePenLine, Image as ImageIcon, Star, Trash2 } from 'lucide-react';

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

const ProjectCard = ({ project, onView, onEdit, onDelete, onToggleFeatured }) => {
  const screenshot = project.screenshots?.[0];

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:border-blue-500/40">
      <div className="relative aspect-[16/9] bg-gradient-to-br from-blue-950 via-slate-900 to-purple-950">
        {screenshot ? (
          <img src={screenshot} alt={`${project.title} project`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center"><ImageIcon className="h-10 w-10 text-blue-300/40" /></div>
        )}
        <button type="button" onClick={() => onToggleFeatured?.(project)} className={`absolute right-3 top-3 rounded-full border p-2 backdrop-blur ${project.featured ? 'border-amber-400/50 bg-amber-500/20 text-amber-300' : 'border-slate-700 bg-slate-950/60 text-slate-400 hover:text-amber-300'}`} aria-label={project.featured ? 'Remove featured flag' : 'Mark project as featured'}>
          <Star className="h-4 w-4" fill={project.featured ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant={STATUS_VARIANTS[project.projectStatus] || 'slate'} size="sm">{project.projectStatus}</Badge>
          <Badge variant={VERIFICATION_VARIANTS[project.verificationStatus] || 'slate'} size="sm">{project.verificationStatus}</Badge>
        </div>

        <h3 className="line-clamp-2 text-lg font-bold leading-snug text-white">{project.title}</h3>
        <p className="mt-2 line-clamp-3 min-h-[3.75rem] text-sm leading-relaxed text-slate-400">{project.shortDescription}</p>

        <div className="mt-4 flex min-h-7 flex-wrap gap-1.5">
          {project.technologies?.slice(0, 5).map((technology) => <span key={technology} className="rounded-md border border-slate-700/70 bg-slate-800/70 px-2 py-1 text-[11px] font-medium text-slate-300">{technology}</span>)}
          {project.technologies?.length > 5 && <span className="px-1 py-1 text-[11px] text-slate-500">+{project.technologies.length - 5}</span>}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-800/70 pt-3 text-[11px] text-slate-500">
          <span>{project.category}</span>
          <span>{formatDate(project.updatedAt || project.createdAt)}</span>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          <Button type="button" variant="secondary" size="xs" leftIcon={Eye} onClick={() => onView(project)}>Details</Button>
          {project.githubRepository && <a href={project.githubRepository} target="_blank" rel="noreferrer" aria-label="Open GitHub repository" className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-700 px-2.5 text-[11px] text-slate-300 hover:border-blue-500/50 hover:text-white"><Github className="h-3.5 w-3.5" /> GitHub</a>}
          {project.liveDeployment && <a href={project.liveDeployment} target="_blank" rel="noreferrer" aria-label="Open live deployment" className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-700 px-2.5 text-[11px] text-slate-300 hover:border-blue-500/50 hover:text-white"><ExternalLink className="h-3.5 w-3.5" /> Live</a>}
          <div className="ml-auto flex gap-1">
            <Button type="button" variant="ghost" size="xs" leftIcon={FilePenLine} onClick={() => onEdit(project)} aria-label="Edit project" />
            <Button type="button" variant="danger" size="xs" leftIcon={Trash2} onClick={() => onDelete(project)} aria-label="Delete project" />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ProjectCard;
