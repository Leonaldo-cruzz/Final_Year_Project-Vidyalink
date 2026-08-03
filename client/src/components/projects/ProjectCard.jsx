import React from 'react';
import { Building, MapPin, Clock, DollarSign, Users, Award, ExternalLink, Send, Edit, Trash2 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

const STATUS_VARIANTS = {
  open: 'success',
  in_progress: 'info',
  completed: 'default',
  closed: 'danger',
};

const DIFFICULTY_VARIANTS = {
  Beginner: 'success',
  Intermediate: 'warning',
  Advanced: 'danger',
};

const ProjectCard = ({
  project,
  isStudent,
  isRecruiter,
  onApply,
  onViewDetails,
  onEdit,
  onDelete,
  onViewApplicants,
}) => {
  const {
    title,
    description,
    company,
    domain,
    requiredSkills = [],
    difficulty = 'Intermediate',
    duration = '1 Month',
    stipend = 0,
    mode = 'Remote',
    status = 'open',
    applicantsCount = 0,
  } = project;

  return (
    <div className="group flex flex-col rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 hover:border-blue-500/40 hover:bg-slate-900/90 transition-all card-hover shadow-lg">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
              <Building className="w-3 h-3" /> {company}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-[11px] font-semibold text-slate-400">{domain}</span>
          </div>
          <h3
            onClick={() => onViewDetails?.(project)}
            className="text-base font-bold text-white group-hover:text-blue-400 transition-colors cursor-pointer line-clamp-1"
          >
            {title}
          </h3>
        </div>

        <Badge variant={STATUS_VARIANTS[status] || 'default'} size="sm" className="capitalize shrink-0">
          {status.replace('_', ' ')}
        </Badge>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
        {description}
      </p>

      {/* Meta Specs Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 mb-4 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
        <div className="flex items-center gap-1.5 truncate">
          <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span className="truncate">{mode}</span>
        </div>
        <div className="flex items-center gap-1.5 truncate">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">{duration}</span>
        </div>
        <div className="flex items-center gap-1.5 truncate">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-semibold text-emerald-400 truncate">
            {stipend > 0 ? `₹${stipend.toLocaleString()}/mo` : 'Unpaid / Experience'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 truncate">
          <Award className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="truncate">{difficulty}</span>
        </div>
      </div>

      {/* Required Skills */}
      {requiredSkills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          {requiredSkills.slice(0, 4).map((skill, idx) => (
            <span
              key={idx}
              className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/60 text-slate-300 font-medium"
            >
              {skill}
            </span>
          ))}
          {requiredSkills.length > 4 && (
            <span className="text-[10px] text-slate-500 font-medium">
              +{requiredSkills.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Card Footer Actions */}
      <div className="mt-auto pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Users className="w-3.5 h-3.5 text-blue-400" />
          <span><strong className="text-slate-200 font-semibold">{applicantsCount}</strong> Applicants</span>
        </div>

        <div className="flex items-center gap-2">
          {isStudent && status === 'open' && (
            <Button
              size="sm"
              variant="primary"
              leftIcon={Send}
              onClick={() => onApply?.(project)}
            >
              Apply
            </Button>
          )}

          {isRecruiter && (
            <>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={Users}
                onClick={() => onViewApplicants?.(project)}
              >
                Applicants
              </Button>
              {onEdit && (
                <button
                  onClick={() => onEdit(project)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Edit Project"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(project)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                  title="Delete Project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onViewDetails?.(project)}
          >
            Details
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
