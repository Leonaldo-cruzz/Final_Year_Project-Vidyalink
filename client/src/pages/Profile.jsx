import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Edit2, CheckCircle2, AlertCircle, Github, Linkedin, UserCircle } from 'lucide-react';

import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { getErrorMessage } from '@/utils/formatters';

const profileSchema = z.object({
  bio:            z.string().max(500).optional(),
  college:        z.string().max(120).optional(),
  branch:         z.string().max(80).optional(),
  graduationYear: z.string().optional(),
  github:         z.string().url('Enter a valid GitHub URL').optional().or(z.literal('')),
  linkedin:       z.string().url('Enter a valid LinkedIn URL').optional().or(z.literal('')),
  skills:         z.string().optional(), // comma separated
});

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(profileSchema) });

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/profile/me');
        const data = res.data?.data?.profile || {};
        setProfileData(data);
        reset({
          bio:            data.bio || '',
          college:        data.college || user?.college || '',
          branch:         data.branch || user?.branch || '',
          graduationYear: data.graduationYear?.toString() || '',
          github:         data.github || '',
          linkedin:       data.linkedin || '',
          skills:         (data.skills || []).join(', '),
        });
      } catch {
        // Profile may not exist yet — use user data
        reset({
          college:        user?.college || '',
          branch:         user?.branch || '',
          graduationYear: user?.graduationYear?.toString() || '',
        });
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [user, reset]);

  const onSubmit = async (data) => {
    setSaveError('');
    setSaveSuccess(false);
    const payload = {
      ...(data.bio && { bio: data.bio }),
      ...(data.college && { college: data.college }),
      ...(data.branch && { branch: data.branch }),
      ...(data.graduationYear && { graduationYear: Number(data.graduationYear) }),
      ...(data.github && { github: data.github }),
      ...(data.linkedin && { linkedin: data.linkedin }),
      skills: data.skills
        ? data.skills.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    };

    try {
      if (profileData?._id) {
        await api.patch('/profile', payload);
      } else {
        await api.post('/profile', payload);
      }
      await refreshUser();
      setSaveSuccess(true);
      setEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(getErrorMessage(err));
    }
  };

  const skills = profileData?.skills || [];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-white">My Profile</h1>
            <p className="text-slate-400 text-sm mt-1">Manage your public academic profile</p>
          </div>
          {!editing && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={Edit2}
              onClick={() => setEditing(true)}
            >
              Edit Profile
            </Button>
          )}
        </div>

        {/* Success/Error */}
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

        {/* Identity Card */}
        <SectionCard className="mb-6">
          <div className="flex items-center gap-5">
            <Avatar name={user?.fullName} size="xl" />
            <div>
              <h2 className="text-xl font-extrabold text-white">{user?.fullName}</h2>
              <p className="text-slate-400 text-sm">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge role={user?.role} dot>{user?.role}</Badge>
                {user?.college && (
                  <span className="text-xs text-slate-500">{user.college}</span>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Skills */}
        {!editing && skills.length > 0 && (
          <SectionCard title="Skills" className="mb-6">
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/25 text-blue-300 text-xs font-semibold"
                >
                  {skill}
                </span>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Edit Form */}
        {editing && (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <SectionCard title="Edit Profile" className="mb-6">
              <div className="space-y-5">
                {/* Bio */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2">Bio</label>
                  <textarea
                    {...register('bio')}
                    rows={3}
                    placeholder="A short bio about yourself…"
                    className="form-input resize-none"
                  />
                  {errors.bio && <p className="mt-1 text-xs text-red-400">{errors.bio.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2">College</label>
                    <input {...register('college')} type="text" placeholder="College / University" className="form-input" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2">Branch</label>
                    <input {...register('branch')} type="text" placeholder="Branch / Major" className="form-input" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2">Graduation Year</label>
                    <input {...register('graduationYear')} type="number" placeholder="e.g. 2026" className="form-input" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2">Skills (comma-separated)</label>
                    <input {...register('skills')} type="text" placeholder="React, Python, Node.js" className="form-input" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2">
                      <Github className="w-3.5 h-3.5 inline mr-1" />GitHub URL
                    </label>
                    <input {...register('github')} type="url" placeholder="https://github.com/username" className={`form-input ${errors.github ? 'error' : ''}`} />
                    {errors.github && <p className="mt-1 text-xs text-red-400">{errors.github.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2">
                      <Linkedin className="w-3.5 h-3.5 inline mr-1" />LinkedIn URL
                    </label>
                    <input {...register('linkedin')} type="url" placeholder="https://linkedin.com/in/username" className={`form-input ${errors.linkedin ? 'error' : ''}`} />
                    {errors.linkedin && <p className="mt-1 text-xs text-red-400">{errors.linkedin.message}</p>}
                  </div>
                </div>
              </div>
            </SectionCard>

            <div className="flex items-center gap-3">
              <Button type="submit" loading={isSubmitting} leftIcon={Save}>
                Save Changes
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Profile;
