import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Edit2,
  GitBranch,
  GraduationCap,
  Link,
  Mail,
  Save,
  Upload,
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import VerificationBadge from '@/components/verification/VerificationBadge';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { getErrorMessage } from '@/utils/formatters';

const githubUsernamePattern = /^(?!-)[A-Za-z\d]+(?:-[A-Za-z\d]+)*$/;
const phonePattern = /^\+?[1-9]\d{7,14}$/;

const optionalUrl = (label) => z.union([
  z.string().trim().url(`Enter a valid ${label}`),
  z.literal(''),
]);

const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(100),
  phone: z.union([
    z.string().trim().regex(phonePattern, 'Use international format, for example +919876543210'),
    z.literal(''),
  ]),
  college: z.string().trim().min(2, 'Enter your college or university').max(200),
  branch: z.string().trim().min(2, 'Enter your branch or major').max(100),
  currentYear: z.string().regex(/^(?:[1-9]|10)$/, 'Select a current year'),
  cgpa: z.union([
    z.string().regex(/^(?:10(?:\.0+)?|[0-9](?:\.\d+)?)$/, 'Enter a CGPA from 0 to 10'),
    z.literal(''),
  ]),
  bio: z.string().trim().max(2000, 'About me must not exceed 2,000 characters'),
  skills: z.string().max(500, 'Skills must not exceed 500 characters'),
  linkedin: optionalUrl('LinkedIn URL'),
  githubUsername: z.union([
    z.string()
      .trim()
      .min(1, 'GitHub username cannot be empty')
      .max(39, 'GitHub username must not exceed 39 characters')
      .regex(githubUsernamePattern, 'Use letters, numbers, and hyphens only'),
    z.literal(''),
  ]),
  portfolio: optionalUrl('portfolio website URL'),
});

const getFormValues = (profile, user) => ({
  fullName: profile?.fullName || user?.fullName || '',
  phone: profile?.phone || '',
  college: profile?.college || user?.college || '',
  branch: profile?.branch || user?.branch || '',
  currentYear: profile?.currentYear?.toString() || '',
  cgpa: profile?.cgpa?.toString() || '',
  bio: profile?.bio || '',
  skills: (profile?.skills || []).join(', '),
  linkedin: profile?.linkedin || '',
  githubUsername: profile?.githubUsername || '',
  portfolio: profile?.portfolio || '',
});

const toNullableText = (value) => value.trim() || null;

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoError, setPhotoError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: getFormValues(null, user),
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/profile/me');
        const profile = response.data?.data?.profile || null;
        setProfileData(profile);
        reset(getFormValues(profile, user));
      } catch (error) {
        if (error.response?.status !== 404) {
          setSaveError(getErrorMessage(error));
        }
        reset(getFormValues(null, user));
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [reset, user]);

  useEffect(() => () => {
    if (photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
  }, [photoPreview]);

  const profilePhoto = photoPreview || profileData?.profilePicture || user?.avatar || '';
  const displayedSkills = profileData?.skills || [];
  const overviewItems = useMemo(() => [
    { label: 'Phone', value: profileData?.phone || 'Not added' },
    { label: 'College', value: profileData?.college || user?.college || 'Not added' },
    { label: 'Branch', value: profileData?.branch || user?.branch || 'Not added' },
    { label: 'Current Year', value: profileData?.currentYear ? `Year ${profileData.currentYear}` : 'Not added' },
    { label: 'CGPA', value: profileData?.cgpa ?? 'Not added' },
    { label: 'GitHub', value: profileData?.githubUsername ? `github.com/${profileData.githubUsername}` : 'Not added' },
  ], [profileData, user]);

  const clearPhotoSelection = () => {
    setSelectedPhoto(null);
    setPhotoError('');
    setPhotoPreview('');
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Choose a JPEG, PNG, or WebP image.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('Profile photo must not exceed 2 MB.');
      return;
    }

    setPhotoError('');
    setSelectedPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (formData) => {
    setSaveError('');
    setSaveSuccess(false);
    setPhotoError('');

    const payload = {
      fullName: formData.fullName.trim(),
      college: formData.college.trim(),
      branch: formData.branch.trim(),
      currentYear: Number(formData.currentYear),
      phone: toNullableText(formData.phone),
      cgpa: formData.cgpa ? Number(formData.cgpa) : null,
      bio: toNullableText(formData.bio),
      skills: formData.skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean),
      linkedin: toNullableText(formData.linkedin),
      githubUsername: toNullableText(formData.githubUsername),
      portfolio: toNullableText(formData.portfolio),
    };

    try {
      const profileResponse = profileData?._id
        ? await api.patch('/profile', payload)
        : await api.post('/profile', payload);
      let updatedProfile = profileResponse.data?.data?.profile;

      if (selectedPhoto) {
        const uploadData = new FormData();
        uploadData.append('profilePhoto', selectedPhoto);
        const photoResponse = await api.post('/profile/photo', uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        updatedProfile = photoResponse.data?.data?.profile;
      }

      setProfileData(updatedProfile);
      reset(getFormValues(updatedProfile, user));
      clearPhotoSelection();
      await refreshUser();
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError(getErrorMessage(error));
    }
  };

  const cancelEditing = () => {
    reset(getFormValues(profileData, user));
    clearPhotoSelection();
    setEditing(false);
    setSaveError('');
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Student Profile</h1>
            <p className="text-slate-400 text-sm mt-1">Build the academic profile recruiters and faculty will review.</p>
          </div>
          {!editing && (
            <Button variant="outline" size="sm" leftIcon={Edit2} onClick={() => setEditing(true)}>
              Edit Profile
            </Button>
          )}
        </div>

        {saveSuccess && (
          <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            Profile updated successfully.
          </div>
        )}
        {saveError && (
          <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            {saveError}
          </div>
        )}

        <SectionCard className="mb-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar src={profilePhoto} name={profileData?.fullName || user?.fullName} size="xl" />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-extrabold text-white truncate">{profileData?.fullName || user?.fullName}</h2>
              <p className="text-slate-400 text-sm flex items-center gap-1.5 mt-1"><Mail className="w-3.5 h-3.5" />{user?.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge role={user?.role} dot>{user?.role}</Badge>
                {profileData?._id && (
                  <VerificationBadge
                    targetType="PROFILE"
                    targetId={profileData._id}
                    size="sm"
                    showDetails={true}
                  />
                )}
                {profileData?.profileCompletion !== undefined && (
                  <span className="text-xs text-slate-500">{profileData.profileCompletion}% profile complete</span>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        {!editing && !loadingProfile && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {overviewItems.map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-800/70 bg-slate-900/45 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-500">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-200 mt-1 break-words">{item.value}</p>
                </div>
              ))}
            </div>

            {profileData?.bio && (
              <SectionCard title="About Me" className="mb-6">
                <p className="text-sm leading-6 text-slate-300 whitespace-pre-wrap">{profileData.bio}</p>
              </SectionCard>
            )}

            {displayedSkills.length > 0 && (
              <SectionCard title="Skills" className="mb-6">
                <div className="flex flex-wrap gap-2">
                  {displayedSkills.map((skill) => (
                    <span key={skill} className="px-3 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/25 text-blue-300 text-xs font-semibold">
                      {skill}
                    </span>
                  ))}
                </div>
              </SectionCard>
            )}
          </>
        )}

        {editing && (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <SectionCard title="Profile Photo" subtitle="JPEG, PNG, or WebP up to 2 MB" className="mb-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar src={profilePhoto} name={profileData?.fullName || user?.fullName} size="xl" />
                <div>
                  <label htmlFor="profile-photo" className="inline-flex items-center justify-center h-10 px-5 text-sm font-semibold rounded-xl cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors">
                    <Camera className="w-4 h-4 mr-2" />
                    Choose Photo
                  </label>
                  <input id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handlePhotoChange} />
                  <p className="text-xs text-slate-500 mt-2">The selected photo uploads when you save your profile.</p>
                  {photoError && <p className="mt-2 text-xs text-red-400">{photoError}</p>}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Academic Information" className="mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Full Name" required {...register('fullName')} error={errors.fullName?.message} placeholder="Your full name" />
                <Input label="Email" value={user?.email || ''} readOnly disabled leftIcon={Mail} helperText="Email is managed through your account." />
                <Input label="Phone" {...register('phone')} error={errors.phone?.message} placeholder="+919876543210" />
                <Input label="College / University" required {...register('college')} error={errors.college?.message} placeholder="Your institution" />
                <Input label="Branch / Major" required {...register('branch')} error={errors.branch?.message} placeholder="Computer Science" />
                <Input label="Current Year" required {...register('currentYear')} error={errors.currentYear?.message} type="number" min="1" max="10" placeholder="e.g. 3" leftIcon={GraduationCap} />
                <Input label="CGPA" {...register('cgpa')} error={errors.cgpa?.message} inputMode="decimal" placeholder="e.g. 8.5" />
              </div>

              <div className="mt-5">
                <label htmlFor="bio" className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2">About Me</label>
                <textarea id="bio" {...register('bio')} rows={5} placeholder="Tell recruiters and faculty about your interests, strengths, and goals." className={`form-input resize-y ${errors.bio ? 'error' : ''}`} />
                {errors.bio && <p className="mt-1 text-xs text-red-400">{errors.bio.message}</p>}
              </div>

              <div className="mt-5">
                <Input label="Skills" {...register('skills')} error={errors.skills?.message} placeholder="React, Node.js, Python, UI/UX" helperText="Separate skills with commas." />
              </div>
            </SectionCard>

            <SectionCard title="Professional Links" className="mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="LinkedIn URL" {...register('linkedin')} error={errors.linkedin?.message} type="url" placeholder="https://linkedin.com/in/your-name" leftIcon={Link} />
                <Input label="GitHub Username" {...register('githubUsername')} error={errors.githubUsername?.message} placeholder="your-github-handle" leftIcon={GitBranch} />
                <Input label="Portfolio Website" {...register('portfolio')} error={errors.portfolio?.message} type="url" placeholder="https://yourportfolio.com" leftIcon={Upload} className="sm:col-span-2" />
              </div>
            </SectionCard>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" loading={isSubmitting} leftIcon={Save}>Save Profile</Button>
              <Button type="button" variant="ghost" onClick={cancelEditing}>Cancel</Button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Profile;
