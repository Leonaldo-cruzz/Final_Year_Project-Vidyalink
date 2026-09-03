import React, { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Building2, Globe2, MapPin, Save } from 'lucide-react';
import { SectionCard } from '@/components/ui/Card';
import DashboardLayout from '@/layouts/DashboardLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import recruiterService from '@/services/recruiterService';
import { getErrorMessage } from '@/utils/formatters';
import { z } from 'zod';

const optionalUrl = z.union([z.string().trim().url('Enter a valid URL').refine((value) => /^https?:\/\//i.test(value), 'URL must use HTTP or HTTPS'), z.literal('')]);
const profileSchema = z.object({
  companyName: z.string().trim().min(2, 'Company name must be at least 2 characters').max(200),
  companyWebsite: optionalUrl,
  companyDescription: z.string().trim().max(5000, 'Description is too long'),
  industry: z.string().trim().max(100, 'Industry is too long'),
  designation: z.string().trim().max(100, 'Designation is too long'),
  location: z.string().trim().max(200, 'Location is too long'),
  companyLogo: optionalUrl,
});

const EMPTY_VALUES = { companyName: '', companyWebsite: '', companyDescription: '', industry: '', designation: '', location: '', companyLogo: '' };
const unwrap = (response) => response?.data ?? response;

const RecruiterProfile = () => {
  const [loading, setLoading] = useState(true);
  const [isNew, setIsNew] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(profileSchema), defaultValues: EMPTY_VALUES });
  const logo = watch('companyLogo');

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const profile = unwrap(await recruiterService.getRecruiterProfile());
        if (active) reset({ ...EMPTY_VALUES, ...profile });
      } catch (requestError) {
        if (requestError.response?.status === 404) setIsNew(true);
        else setLoadError(getErrorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    };
    loadProfile();
    return () => { active = false; };
  }, [reset]);

  const onSubmit = async (values) => {
    try {
      setNotice('');
      setLoadError('');
      const payload = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim() || null]));
      const response = isNew ? await recruiterService.createRecruiterProfile({ ...payload, companyName: values.companyName.trim() }) : await recruiterService.updateRecruiterProfile(payload);
      reset({ ...EMPTY_VALUES, ...unwrap(response) });
      setIsNew(false);
      setNotice('Recruiter profile saved successfully.');
    } catch (requestError) {
      setLoadError(getErrorMessage(requestError));
    }
  };

  if (loading) return <DashboardLayout><div className="flex min-h-96 items-center justify-center"><Spinner /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="mb-7"><h1 className="text-2xl font-extrabold text-white">Recruiter profile</h1><p className="mt-1 text-sm text-slate-400">Keep your company context current so candidates know who is reaching out.</p></div>
      {notice && <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-300">{notice}</div>}
      {loadError && <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">{loadError}</div>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <SectionCard title="Company details" subtitle="This information is used across recruiter-facing workflows.">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Input id="company-name" label="Company name" required error={errors.companyName?.message} leftIcon={Building2} {...register('companyName')} />
            <Input id="company-website" label="Website" error={errors.companyWebsite?.message} leftIcon={Globe2} placeholder="https://company.example" {...register('companyWebsite')} />
            <Input id="company-industry" label="Industry" error={errors.industry?.message} placeholder="Software, finance, healthcare…" {...register('industry')} />
            <Input id="company-designation" label="Your designation" error={errors.designation?.message} placeholder="Talent partner" {...register('designation')} />
            <Input id="company-location" label="Location" error={errors.location?.message} leftIcon={MapPin} placeholder="City, country" {...register('location')} />
            <Input id="company-logo" label="Logo URL" error={errors.companyLogo?.message} placeholder="https://…/logo.png" {...register('companyLogo')} />
          </div>
          <div className="mt-5"><label htmlFor="company-description" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-300">Company description</label><textarea id="company-description" className={`form-input min-h-32 ${errors.companyDescription ? 'error' : ''}`} placeholder="Tell candidates about your organisation…" {...register('companyDescription')} />{errors.companyDescription && <p className="mt-1.5 text-xs text-red-400">{errors.companyDescription.message}</p>}</div>
          {logo && <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3"><img src={logo} alt="Company logo preview" className="h-12 w-12 rounded-lg object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} /><span className="text-xs text-slate-400">Logo preview</span></div>}
        </SectionCard>
        <div className="flex justify-end"><Button type="submit" loading={isSubmitting} leftIcon={Save}>{isNew ? 'Create profile' : 'Save changes'}</Button></div>
      </form>
    </DashboardLayout>
  );
};

export default RecruiterProfile;

