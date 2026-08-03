import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Save, AlertCircle, ArrowLeft } from 'lucide-react';

import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { createProject } from '@/services/projectService';
import { ROUTES } from '@/constants';
import { getErrorMessage } from '@/utils/formatters';

const projectSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(150, 'Title must not exceed 150 characters'),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(5000, 'Description must not exceed 5000 characters'),
  company: z
    .string()
    .min(2, 'Company name required')
    .default('VidyaLink Partner'),
  domain: z
    .string()
    .min(2, 'Domain required')
    .default('Software Development'),
  requiredSkills: z
    .string()
    .min(1, 'Please enter at least one skill'),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  duration: z.string().min(1, 'Duration required'),
  stipend: z.string().optional(),
  mode: z.enum(['Remote', 'Hybrid', 'In-office']),
  deadline: z.string().optional(),
});

const CreateProject = () => {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      company: 'VidyaLink Partner',
      domain: 'Software Engineering',
      difficulty: 'Intermediate',
      duration: '1 Month',
      mode: 'Remote',
      stipend: '0',
    },
  });

  const onSubmit = async (data) => {
    setSubmitError('');
    const payload = {
      title: data.title.trim(),
      description: data.description.trim(),
      company: data.company.trim(),
      domain: data.domain.trim(),
      requiredSkills: data.requiredSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      difficulty: data.difficulty,
      duration: data.duration.trim(),
      stipend: Number(data.stipend) || 0,
      mode: data.mode,
      ...(data.deadline && { deadline: data.deadline }),
    };

    try {
      await createProject(payload);
      navigate(ROUTES.PROJECTS);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <button
            onClick={() => navigate(ROUTES.PROJECTS)}
            className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Marketplace
          </button>
          <h1 className="text-2xl font-extrabold text-white">Post a New Live Project</h1>
          <p className="text-slate-400 text-sm mt-1">
            Define a live project listing to invite student candidates and track completion.
          </p>
        </div>

        {submitError && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <SectionCard className="space-y-5">
            {/* Title & Company */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Project Title *
                </label>
                <input
                  {...register('title')}
                  type="text"
                  placeholder="e.g. Full-Stack E-Commerce Analytics Engine"
                  className={`form-input ${errors.title ? 'error' : ''}`}
                />
                {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Company / Organization *
                </label>
                <input
                  {...register('company')}
                  type="text"
                  placeholder="e.g. Acme Tech Labs"
                  className={`form-input ${errors.company ? 'error' : ''}`}
                />
                {errors.company && <p className="mt-1 text-xs text-red-400">{errors.company.message}</p>}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Project Description & Scope *
              </label>
              <textarea
                {...register('description')}
                rows={5}
                placeholder="Describe project objectives, key deliverables, expectations, and mentorship provided..."
                className={`form-input resize-none ${errors.description ? 'error' : ''}`}
              />
              {errors.description && <p className="mt-1 text-xs text-red-400">{errors.description.message}</p>}
            </div>

            {/* Domain & Skills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Domain / Category *
                </label>
                <input
                  {...register('domain')}
                  type="text"
                  placeholder="e.g. AI / Machine Learning, Web Dev, Mobile"
                  className={`form-input ${errors.domain ? 'error' : ''}`}
                />
                {errors.domain && <p className="mt-1 text-xs text-red-400">{errors.domain.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Required Skills (comma-separated) *
                </label>
                <input
                  {...register('requiredSkills')}
                  type="text"
                  placeholder="React, Node.js, MongoDB, TypeScript"
                  className={`form-input ${errors.requiredSkills ? 'error' : ''}`}
                />
                {errors.requiredSkills && (
                  <p className="mt-1 text-xs text-red-400">{errors.requiredSkills.message}</p>
                )}
              </div>
            </div>

            {/* Difficulty, Duration, Stipend, Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Difficulty Level
                </label>
                <select {...register('difficulty')} className="form-input">
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Work Mode
                </label>
                <select {...register('mode')} className="form-input">
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="In-office">In-office</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Duration
                </label>
                <input
                  {...register('duration')}
                  type="text"
                  placeholder="e.g. 2 Months"
                  className="form-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Monthly Stipend (₹)
                </label>
                <input
                  {...register('stipend')}
                  type="number"
                  placeholder="0 for unpaid"
                  min="0"
                  className="form-input"
                />
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Application Deadline
              </label>
              <input
                {...register('deadline')}
                type="date"
                className="form-input max-w-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <Button type="button" variant="ghost" onClick={() => navigate(ROUTES.PROJECTS)}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting} leftIcon={Save}>
                Post Live Project
              </Button>
            </div>
          </SectionCard>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default CreateProject;
