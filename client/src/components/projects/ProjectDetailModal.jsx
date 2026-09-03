import React from 'react';
import { Building, MapPin, Clock, DollarSign, Users, Calendar, Send } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

const ProjectDetailModal = ({ open, onClose, project, isStudent, onApply }) => {
  if (!project) return null;

  const {
    title,
    description,
    company = 'VidyaLink Partner',
    domain = 'Software Engineering',
    requiredSkills = [],
    difficulty = 'Intermediate',
    duration = '1 Month',
    stipend = 0,
    mode = 'Remote',
    deadline,
    status = 'open',
    applicantsCount = 0,
  } = project;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
    >
      <div className="space-y-6">
        {/* Company & Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm text-blue-400 font-bold">
            <Building className="w-4 h-4" /> {company}
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-300 font-semibold">{domain}</span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={status === 'open' ? 'success' : 'info'} className="capitalize">
              {status.replace('_', ' ')}
            </Badge>
            <Badge variant="warning">{difficulty}</Badge>
          </div>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Work Mode</span>
            <span className="text-xs font-bold text-white flex items-center justify-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5 text-purple-400" /> {mode}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Duration</span>
            <span className="text-xs font-bold text-white flex items-center justify-center gap-1 mt-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> {duration}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Stipend</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1 mt-1">
              <DollarSign className="w-3.5 h-3.5" /> {stipend > 0 ? `₹${stipend.toLocaleString()}/mo` : 'Unpaid'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Applicants</span>
            <span className="text-xs font-bold text-blue-400 flex items-center justify-center gap-1 mt-1">
              <Users className="w-3.5 h-3.5" /> {applicantsCount}
            </span>
          </div>
        </div>

        {/* Project Overview */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Project Overview</h4>
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
            {description}
          </div>
        </div>

        {/* Required Skills */}
        {requiredSkills.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Required Skills & Stack</h4>
            <div className="flex flex-wrap gap-2">
              {requiredSkills.map((skill, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {deadline && (
          <div className="flex items-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Application Deadline: <strong className="text-slate-200">{new Date(deadline).toLocaleDateString()}</strong></span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {isStudent && status === 'open' && (
            <Button
              variant="primary"
              leftIcon={Send}
              onClick={() => {
                onClose();
                onApply?.(project);
              }}
            >
              Apply for Project
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ProjectDetailModal;
