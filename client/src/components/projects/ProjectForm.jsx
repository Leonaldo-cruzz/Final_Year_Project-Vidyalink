import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ImagePlus, Plus, Save, X } from 'lucide-react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const CATEGORY_OPTIONS = [
  'Web Development',
  'Mobile App',
  'AI / ML',
  'Cloud',
  'Cyber Security',
  'IoT',
  'Blockchain',
  'Desktop Application',
  'Research',
  'Other',
];

const STATUS_OPTIONS = ['Completed', 'In Progress', 'Prototype', 'Archived'];

const emptyToUndefined = (value) => (value === '' ? undefined : value);

export const projectFormSchema = z.object({
  title: z.string().trim().min(2, 'Title is required').max(150),
  shortDescription: z.string().trim().min(10, 'Add at least 10 characters').max(500),
  detailedDescription: z.string().trim().min(20, 'Add at least 20 characters').max(5000),
  category: z.string().min(1, 'Select a category'),
  domain: z.string().trim().max(100).optional(),
  technologies: z.array(z.string().min(1)).min(1, 'Add at least one technology'),
  githubRepository: z.preprocess(emptyToUndefined, z.string().url('Enter a valid URL').optional()),
  liveDeployment: z.preprocess(emptyToUndefined, z.string().url('Enter a valid URL').optional()),
  demoVideo: z.preprocess(emptyToUndefined, z.string().url('Enter a valid URL').optional()),
  documentationUrl: z.preprocess(emptyToUndefined, z.string().url('Enter a valid URL').optional()),
  teamMembers: z.array(z.string().min(1)).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  projectStatus: z.enum(['Completed', 'In Progress', 'Prototype', 'Archived']),
});

const inputClass = 'form-input';
const labelClass = 'block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5';

const TagEditor = ({ label, tags, setTags, placeholder, error, required = false }) => {
  const [value, setValue] = useState('');

  const addTag = () => {
    const nextTag = value.trim().replace(/,$/, '');
    if (!nextTag || tags.includes(nextTag)) return setValue('');
    setTags([...tags, nextTag]);
    setValue('');
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag();
    }
    if (event.key === 'Backspace' && !value && tags.length) {
      setTags(tags.slice(0, -1));
    }
  };

  return (
    <div>
      <label className={labelClass}>{label} {required && '*'}</label>
      <div className={`${inputClass} min-h-11 flex flex-wrap items-center gap-2 py-2`}>
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-lg bg-blue-500/15 border border-blue-500/25 px-2 py-1 text-xs text-blue-300">
            {tag}
            <button type="button" onClick={() => setTags(tags.filter((item) => item !== tag))} aria-label={`Remove ${tag}`}>
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={tags.length ? 'Add another...' : placeholder}
          className="min-w-[140px] flex-1 bg-transparent outline-none text-sm text-white placeholder:text-slate-600"
        />
        <button type="button" onClick={addTag} className="text-slate-500 hover:text-blue-400" aria-label="Add tag">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};

const formatDateInput = (date) => (date ? new Date(date).toISOString().slice(0, 10) : '');

const ProjectForm = ({
  initialValues,
  initialScreenshots = [],
  onSubmit,
  onCancel,
  submitLabel = 'Save Project',
  submitting = false,
  serverError = '',
}) => {
  const [technologies, setTechnologies] = useState(initialValues?.technologies || []);
  const [teamMembers, setTeamMembers] = useState(initialValues?.teamMembers || []);
  const [screenshots, setScreenshots] = useState(initialScreenshots);
  const [newScreenshots, setNewScreenshots] = useState([]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: '',
      shortDescription: '',
      detailedDescription: '',
      category: CATEGORY_OPTIONS[0],
      domain: '',
      technologies: [],
      teamMembers: [],
      githubRepository: '',
      liveDeployment: '',
      demoVideo: '',
      documentationUrl: '',
      projectStatus: 'In Progress',
      ...(initialValues ? {
        title: initialValues.title || '',
        shortDescription: initialValues.shortDescription || '',
        detailedDescription: initialValues.detailedDescription || '',
        category: initialValues.category || CATEGORY_OPTIONS[0],
        domain: initialValues.domain || '',
        technologies: initialValues.technologies || [],
        teamMembers: initialValues.teamMembers || [],
        githubRepository: initialValues.githubRepository || '',
        liveDeployment: initialValues.liveDeployment || '',
        demoVideo: initialValues.demoVideo || '',
        documentationUrl: initialValues.documentationUrl || '',
        projectStatus: initialValues.projectStatus || 'In Progress',
      } : {}),
      startDate: formatDateInput(initialValues?.startDate),
      endDate: formatDateInput(initialValues?.endDate),
    },
  });

  useEffect(() => {
    setValue('technologies', technologies, { shouldValidate: true });
  }, [technologies, setValue]);

  useEffect(() => {
    setValue('teamMembers', teamMembers);
  }, [teamMembers, setValue]);

  useEffect(() => {
    setScreenshots(initialScreenshots);
  }, [initialScreenshots]);

  const submitForm = (values) => onSubmit({
    ...values,
    technologies,
    teamMembers,
    existingScreenshots: screenshots,
    screenshots: newScreenshots,
  });

  return (
    <form onSubmit={handleSubmit(submitForm)} noValidate className="space-y-6">
      <Card className="p-5 sm:p-7 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className={labelClass}>Project Title *</label>
            <input {...register('title')} className={inputClass} placeholder="e.g. Smart Campus Navigator" />
            {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>}
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Short Description *</label>
            <input {...register('shortDescription')} className={inputClass} placeholder="One sentence that explains the project outcome" />
            {errors.shortDescription && <p className="mt-1 text-xs text-red-400">{errors.shortDescription.message}</p>}
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Detailed Description *</label>
            <textarea {...register('detailedDescription')} rows={6} className={`${inputClass} resize-y`} placeholder="Explain the problem, your approach, key features, and your contribution..." />
            {errors.detailedDescription && <p className="mt-1 text-xs text-red-400">{errors.detailedDescription.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Category *</label>
            <select {...register('category')} className={inputClass}>
              {CATEGORY_OPTIONS.map((category) => <option key={category}>{category}</option>)}
            </select>
            {errors.category && <p className="mt-1 text-xs text-red-400">{errors.category.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Domain</label>
            <input {...register('domain')} className={inputClass} placeholder="e.g. Education Technology" />
            {errors.domain && <p className="mt-1 text-xs text-red-400">{errors.domain.message}</p>}
          </div>

          <div className="md:col-span-2">
            <TagEditor label="Technologies" tags={technologies} setTags={setTechnologies} placeholder="Type a technology and press Enter" required error={errors.technologies?.message} />
          </div>

          <div>
            <label className={labelClass}>GitHub Repository</label>
            <input {...register('githubRepository')} type="url" className={inputClass} placeholder="https://github.com/..." />
            {errors.githubRepository && <p className="mt-1 text-xs text-red-400">{errors.githubRepository.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Live Deployment URL</label>
            <input {...register('liveDeployment')} type="url" className={inputClass} placeholder="https://your-project.com" />
            {errors.liveDeployment && <p className="mt-1 text-xs text-red-400">{errors.liveDeployment.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Demo Video URL</label>
            <input {...register('demoVideo')} type="url" className={inputClass} placeholder="https://youtube.com/..." />
            {errors.demoVideo && <p className="mt-1 text-xs text-red-400">{errors.demoVideo.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Documentation URL</label>
            <input {...register('documentationUrl')} type="url" className={inputClass} placeholder="https://docs.example.com/..." />
            {errors.documentationUrl && <p className="mt-1 text-xs text-red-400">{errors.documentationUrl.message}</p>}
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Screenshots</label>
            <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/50 text-center hover:border-blue-500/50">
              <ImagePlus className="w-6 h-6 text-slate-500 mb-2" />
              <span className="text-xs text-slate-400">Upload up to 6 JPG, PNG, or WEBP images (5 MB each)</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => setNewScreenshots(Array.from(event.target.files || []))} />
            </label>
            {newScreenshots.length > 0 && <p className="mt-2 text-xs text-blue-300">{newScreenshots.length} new screenshot(s) selected.</p>}
            {screenshots.length > 0 && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {screenshots.map((screenshot) => (
                  <div key={screenshot} className="relative aspect-video overflow-hidden rounded-lg border border-slate-700">
                    <img src={screenshot} alt="Project screenshot" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setScreenshots(screenshots.filter((item) => item !== screenshot))} className="absolute top-1 right-1 rounded-full bg-slate-950/80 p-1 text-slate-200 hover:text-red-400" aria-label="Remove screenshot"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <TagEditor label="Team Members" tags={teamMembers} setTags={setTeamMembers} placeholder="Add a teammate name" />
          </div>

          <div>
            <label className={labelClass}>Start Date</label>
            <input {...register('startDate')} type="date" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>End Date</label>
            <input {...register('endDate')} type="date" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Project Status</label>
            <select {...register('projectStatus')} className={inputClass}>
              {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>
        </div>

        {serverError && <p className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-400">{serverError}</p>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-slate-800/60 pt-5">
          <Button type="button" variant="ghost" leftIcon={ArrowLeft} onClick={onCancel}>Cancel</Button>
          <Button type="submit" leftIcon={Save} loading={submitting}>{submitLabel}</Button>
        </div>
      </Card>
    </form>
  );
};

export default ProjectForm;
