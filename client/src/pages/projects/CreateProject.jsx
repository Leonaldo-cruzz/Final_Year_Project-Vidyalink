import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Save, AlertCircle } from 'lucide-react';

import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import api from '@/services/api';
import { ROUTES } from '@/constants';
import { getErrorMessage } from '@/utils/formatters';

const projectSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(150, 'Title too long'),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000),
  tags: z.string().optional(),
  maxMembers: z
    .string()
    .optional()
    .refine((v) => !v || (Number(v) >= 1 && Number(v) <= 50), {
      message: 'Team size must be between 1 and 50',
    }),
  deadline: z.string().optional(),
});

const CreateProject = () => {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(projectSchema) });

  const [submitError, setSubmitError] = React.useState('');

  const onSubmit = async (data) => {
    setSubmitError('');
    const payload = {
      title: data.title.trim(),
      description: data.description.trim(),
      tags: data.tags
        ? data.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
      ...(data.maxMembers && { maxMembers: Number(data.maxMembers) }),
      ...(data.deadline && { deadline: data.deadline }),
    };

    try {
      const res = await api.post('/projects', payload);
      const projectId = res.data?.data?.project?._id || res.data?.data?._id;
      navigate(projectId ? `/projects/${projectId}` : ROUTES.PROJECTS);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-white">Post a New Project</h1>
          <p className="text-slate-400 text-sm mt-1">Define a live project for students to collaborate on.</p>
        </div>

        {submitError && (
          <div className="mb-5 flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <SectionCard className="mb-6">
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2">
                  Project Title *
                </label>
                <input
                  {...register('title')}
                  type="text"
                  id="project-title"
                  placeholder="e.g. AI-Powered Crop Disease Detection"
                  className={`form-input ${errors.title ? 'error' : ''}`}
                />
                {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2">
                  Description *
                </label>
                <textarea
                  {...register('description')}
                  rows={5}
                  id="project-description"
                  placeholder="Describe the project goals, technologies, and expected outcomes…"
                  className={`form-input resize-none ${errors.description ? 'error' : ''}`}
                />
                {errors.description && <p className="mt-1 text-xs text-red-400">{errors.description.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  {...register('tags')}
                  type="text"
                  id="project-tags"
                  placeholder="React, Node.js, Machine Learning"
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2">
                    Max Team Size
                  </label>
                  <input
                    {...register('maxMembers')}
                    type="number"
                    id="project-maxmembers"
                    placeholder="e.g. 5"
                    min="1"
                    max="50"
                    className={`form-input ${errors.maxMembers ? 'error' : ''}`}
                  />
                  {errors.maxMembers && <p className="mt-1 text-xs text-red-400">{errors.maxMembers.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2">
                    Deadline
                  </label>
                  <input
                    {...register('deadline')}
                    type="date"
                    id="project-deadline"
                    className="form-input"
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          <div className="flex items-center gap-3">
            <Button type="submit" loading={isSubmitting} leftIcon={Save}>
              Post Project
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate(ROUTES.PROJECTS)}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default CreateProject;
