import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, AlertCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { applyToProject } from '@/services/applicationService';
import { getErrorMessage } from '@/utils/formatters';

const applySchema = z.object({
  pitch: z
    .string()
    .min(10, 'Pitch must be at least 10 characters')
    .max(3000, 'Pitch must not exceed 3000 characters'),
  resumeUrl: z.string().url('Invalid Resume URL').or(z.literal('')).optional(),
  githubUrl: z.string().url('Invalid GitHub URL').or(z.literal('')).optional(),
  skills: z.string().optional(),
});

const ApplyProjectModal = ({ open, onClose, project, onSuccess }) => {
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(applySchema),
  });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      const payload = {
        projectId: project._id,
        pitch: data.pitch.trim(),
        resumeUrl: data.resumeUrl?.trim() || null,
        githubUrl: data.githubUrl?.trim() || null,
        skills: data.skills
          ? data.skills.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      };
      await applyToProject(payload);
      reset();
      onSuccess?.();
      onClose();
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  if (!project) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Apply to "${project.title}"`}
      size="md"
    >
      {serverError && (
        <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Pitch / Cover Letter *
          </label>
          <textarea
            {...register('pitch')}
            rows={4}
            placeholder="Explain why you are a great fit for this project and your relevant experience..."
            className={`form-input resize-none ${errors.pitch ? 'error' : ''}`}
          />
          {errors.pitch && <p className="mt-1 text-xs text-red-400">{errors.pitch.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Resume / Portfolio Link
          </label>
          <input
            {...register('resumeUrl')}
            type="url"
            placeholder="https://drive.google.com/your-resume"
            className={`form-input ${errors.resumeUrl ? 'error' : ''}`}
          />
          {errors.resumeUrl && <p className="mt-1 text-xs text-red-400">{errors.resumeUrl.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            GitHub Profile
          </label>
          <input
            {...register('githubUrl')}
            type="url"
            placeholder="https://github.com/yourusername"
            className={`form-input ${errors.githubUrl ? 'error' : ''}`}
          />
          {errors.githubUrl && <p className="mt-1 text-xs text-red-400">{errors.githubUrl.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Relevant Skills (comma-separated)
          </label>
          <input
            {...register('skills')}
            type="text"
            placeholder="React, Express, Python, Tailwind"
            className="form-input"
          />
        </div>

        <div className="pt-3 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} leftIcon={Send}>
            Submit Application
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ApplyProjectModal;
