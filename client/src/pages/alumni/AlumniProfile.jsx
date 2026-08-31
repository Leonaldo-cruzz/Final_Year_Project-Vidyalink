import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import alumniService from '@/services/alumniService';
import { useAuth } from '@/context/AuthContext';
import {
  Building2, Briefcase, Globe, Code2 as Github, MapPin,
  CheckCircle2, Save, Sparkles, Award, Users, Plus, X, Link,
} from 'lucide-react';

const AlumniProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    company: '',
    designation: '',
    industry: '',
    experience: 0,
    experienceSummary: '',
    skills: [],
    bio: '',
    location: '',
    linkedin: '',
    github: '',
    companyWebsite: '',
    mentorshipAvailable: true,
    mockInterviewsAvailable: true,
    referralsAvailable: true,
  });

  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await alumniService.getProfile();
      setProfile(data);
      if (data) {
        setFormData({
          company: data.company || '',
          designation: data.designation || '',
          industry: data.industry || '',
          experience: data.experience || 0,
          experienceSummary: data.experienceSummary || '',
          skills: data.skills || [],
          bio: data.bio || '',
          location: data.location || '',
          linkedin: data.linkedin || '',
          github: data.github || '',
          companyWebsite: data.companyWebsite || '',
          mentorshipAvailable: data.mentorshipAvailable ?? true,
          mockInterviewsAvailable: data.mockInterviewsAvailable ?? true,
          referralsAvailable: data.referralsAvailable ?? true,
        });
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (!skillInput.trim()) return;
    if (!formData.skills.includes(skillInput.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] });
    }
    setSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((s) => s !== skillToRemove),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const updated = await alumniService.updateProfile(formData);
      setProfile(updated);
      setSuccessMsg('Alumni profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={user?.fullName || 'Alumni'} size="xl" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-white">{user?.fullName}</h1>
                <Badge variant="amber" size="sm">Verified Alumni</Badge>
              </div>
              <p className="text-slate-400 text-sm mt-0.5">
                {formData.designation ? `${formData.designation} at ${formData.company}` : 'Mentor & Industry Expert'}
              </p>
              <p className="text-slate-500 text-xs mt-1 flex items-center gap-2">
                <span>{user?.college || 'MIT University'}</span>
                {user?.graduationYear && <span>• Class of {user.graduationYear}</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-sm font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Professional Role */}
          <SectionCard title="Professional Overview" subtitle="Your current employer and industry track">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Company Name <span className="text-rose-400">*</span>
                </label>
                <Input
                  placeholder="e.g. Google, Microsoft, Stripe"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Designation / Role <span className="text-rose-400">*</span>
                </label>
                <Input
                  placeholder="e.g. Senior Software Engineer"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Industry Track <span className="text-rose-400">*</span>
                </label>
                <Input
                  placeholder="e.g. Fintech, Cloud Infrastructure, AI / ML, E-Commerce"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Years of Industry Experience
                </label>
                <Input
                  type="number"
                  min="0"
                  max="70"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: Number(e.target.value) })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Location
                </label>
                <Input
                  placeholder="e.g. Bengaluru, India / San Francisco, CA"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            </div>
          </SectionCard>

          {/* Skills & Bio */}
          <SectionCard title="Expertise & Bio" subtitle="Skills you can mentor in, endorse, or evaluate">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Professional Bio
                </label>
                <textarea
                  className="w-full h-28 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                  placeholder="Tell students about your journey, projects, and the guidance you offer..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Skills & Domains
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="e.g. System Design, Kubernetes, React, Python"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                  />
                  <Button type="button" variant="secondary" onClick={handleAddSkill}>
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((sk) => (
                    <span
                      key={sk}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold"
                    >
                      {sk}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(sk)}
                        className="hover:text-rose-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Social & Company Links */}
          <SectionCard title="Online Presence & Links" subtitle="Verified profiles for students to learn more">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  LinkedIn URL
                </label>
                <Input
                  placeholder="https://linkedin.com/in/username"
                  value={formData.linkedin}
                  onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  GitHub Profile URL
                </label>
                <Input
                  placeholder="https://github.com/username"
                  value={formData.github}
                  onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Company / Portfolio Website
                </label>
                <Input
                  placeholder="https://yourcompany.com"
                  value={formData.companyWebsite}
                  onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value })}
                />
              </div>
            </div>
          </SectionCard>

          {/* Availability Settings */}
          <SectionCard title="Ecosystem Availability" subtitle="Control what student interaction services you are open to">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.mentorshipAvailable}
                  onChange={(e) => setFormData({ ...formData, mentorshipAvailable: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-800 border-slate-700"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-200">1:1 Mentorship</p>
                  <p className="text-xs text-slate-500">Receive mentee guidance requests</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.mockInterviewsAvailable}
                  onChange={(e) => setFormData({ ...formData, mockInterviewsAvailable: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-800 border-slate-700"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-200">Mock Interviews</p>
                  <p className="text-xs text-slate-500">Conduct online & offline drills</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.referralsAvailable}
                  onChange={(e) => setFormData({ ...formData, referralsAvailable: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-800 border-slate-700"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-200">Job Referrals</p>
                  <p className="text-xs text-slate-500">Refer candidates to your company</p>
                </div>
              </label>
            </div>
          </SectionCard>

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <Button type="submit" variant="primary" size="lg" loading={saving}>
              <Save className="w-5 h-5 mr-2" />
              Save Profile Changes
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default AlumniProfile;
