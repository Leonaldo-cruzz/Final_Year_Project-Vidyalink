import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Button from '@/components/ui/Button';
import ResumeSectionSelector from './ResumeSectionSelector';

const schema = z.object({
  targetRole: z.string().trim().min(2, 'Enter the role you are targeting').max(150),
  targetCompany: z.string().trim().max(200).optional(),
  jobDescription: z.string().trim().max(10000).optional(),
  requiredSkillsText: z.string().trim().max(1000).optional(),
  preferredSkillsText: z.string().trim().max(1000).optional(),
  selectedSections: z.array(z.string()).min(1, 'Select at least one section'),
  selectedProjectIds: z.array(z.string()),
  selectedCertificateIds: z.array(z.string()),
});
const fieldClass = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500';

const ResumeBuilderForm = ({ projects = [], certificates = [], profile, onGenerate, loading }) => {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { targetRole: profile?.headline || '', targetCompany: '', jobDescription: '', selectedSections: ['summary', 'skills', 'education', 'projects', 'certifications', 'links'], selectedProjectIds: projects.map((item) => item._id), selectedCertificateIds: certificates.map((item) => item._id) },
  });
  useEffect(() => { setValue('selectedProjectIds', projects.map((item) => item._id)); setValue('selectedCertificateIds', certificates.map((item) => item._id)); }, [projects, certificates, setValue]);
  const selectedSections = watch('selectedSections');
  const selectedProjects = watch('selectedProjectIds');
  const selectedCertificates = watch('selectedCertificateIds');
  const unavailable = [!profile?.bio && !profile?.headline && 'summary', !profile?.skills?.length && !projects.length && !certificates.length && 'skills', !profile?.college && 'education', !projects.length && 'projects', !certificates.length && 'certifications', ![profile?.linkedin, profile?.github, profile?.portfolio, profile?.githubUsername].some(Boolean) && 'links', 'experience', 'achievements'].filter(Boolean);
  const checkboxList = (name, values, selected, label) => <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{label}</p>{values.length ? <div className="space-y-2 max-h-40 overflow-auto">{values.map((item) => <label key={item._id} className="flex gap-2 text-sm text-slate-300"><input type="checkbox" checked={selected.includes(item._id)} onChange={(event) => setValue(name, event.target.checked ? [...selected, item._id] : selected.filter((id) => id !== item._id), { shouldValidate: true })} />{item.title}</label>)}</div> : <p className="text-xs text-slate-600">No verified {label.toLowerCase()} available.</p>}</div>;
  const submit = (values) => onGenerate({ ...values, requiredSkills: (values.requiredSkillsText || '').split(',').map((item) => item.trim()).filter(Boolean), preferredSkills: (values.preferredSkillsText || '').split(',').map((item) => item.trim()).filter(Boolean) });
  return <form onSubmit={handleSubmit(submit)} className="space-y-5">
    <div><label className="text-sm text-slate-300">Target role *</label><input className={fieldClass} {...register('targetRole')} placeholder="e.g. Full Stack Developer" />{errors.targetRole && <p className="text-xs text-red-400 mt-1">{errors.targetRole.message}</p>}</div>
    <div><label className="text-sm text-slate-300">Target company <span className="text-slate-600">(optional)</span></label><input className={fieldClass} {...register('targetCompany')} /></div>
    <div><label className="text-sm text-slate-300">Job description <span className="text-slate-600">(optional)</span></label><textarea rows="5" className={fieldClass} {...register('jobDescription')} placeholder="Paste the job description to prioritize matching, verified skills." /></div>
    <div><label className="text-sm text-slate-300">Required skills <span className="text-slate-600">(comma separated, optional)</span></label><input className={fieldClass} {...register('requiredSkillsText')} placeholder="React, Node.js, MongoDB" /></div>
    <div><label className="text-sm text-slate-300">Preferred skills <span className="text-slate-600">(comma separated, optional)</span></label><input className={fieldClass} {...register('preferredSkillsText')} placeholder="Docker, AWS" /></div>
    <div><p className="text-sm text-slate-300 mb-2">Sections</p><ResumeSectionSelector value={selectedSections} onChange={(value) => setValue('selectedSections', value, { shouldValidate: true })} disabledSections={unavailable} />{errors.selectedSections && <p className="text-xs text-red-400 mt-1">{errors.selectedSections.message}</p>}</div>
    {checkboxList('selectedProjectIds', projects, selectedProjects, 'Verified projects')}
    {checkboxList('selectedCertificateIds', certificates, selectedCertificates, 'Verified certificates')}
    <Button type="submit" fullWidth loading={loading}>Generate ATS-friendly resume</Button>
  </form>;
};

export default ResumeBuilderForm;
