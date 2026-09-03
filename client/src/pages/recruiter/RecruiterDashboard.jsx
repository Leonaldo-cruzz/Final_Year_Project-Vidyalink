import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, Bookmark, CalendarDays, Search, Users, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { ActionCard, SectionCard, StatCard } from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import recruiterService from '@/services/recruiterService';
import { formatDate, getErrorMessage } from '@/utils/formatters';
import { useAuth } from '@/context/AuthContext';

const unwrap = (response) => response?.data ?? response;
const isUpcoming = (interview) => ['SCHEDULED', 'RESCHEDULED'].includes(interview.status) && new Date(interview.scheduledAt).getTime() >= Date.now();
const statusLabel = (status) => ({ SCHEDULED: 'Interview scheduled', RESCHEDULED: 'Interview rescheduled', COMPLETED: 'Interview completed', CANCELLED: 'Interview cancelled', NO_SHOW: 'Interview marked no-show' }[status] || status);

const RecruiterDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [shortlists, setShortlists] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const loadDashboard = async () => {
      const results = await Promise.allSettled([
        recruiterService.getRecruiterProfile(),
        recruiterService.getShortlists({ status: 'SHORTLISTED', limit: 100 }),
        recruiterService.getInterviews({ limit: 100 }),
      ]);
      if (!active) return;
      const messages = [];
      if (results[0].status === 'fulfilled') setProfile(unwrap(results[0].value));
      else if (results[0].reason?.response?.status !== 404) messages.push(getErrorMessage(results[0].reason));
      if (results[1].status === 'fulfilled') setShortlists(unwrap(results[1].value)?.shortlists || []);
      else messages.push(getErrorMessage(results[1].reason));
      if (results[2].status === 'fulfilled') setInterviews(unwrap(results[2].value)?.interviews || []);
      else messages.push(getErrorMessage(results[2].reason));
      setError(messages[0] || '');
      setLoading(false);
    };
    loadDashboard();
    return () => { active = false; };
  }, []);

  const upcoming = useMemo(() => interviews.filter(isUpcoming).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)).slice(0, 5), [interviews]);
  const engagedCandidateIds = useMemo(() => new Set([...shortlists.map((item) => item.studentId), ...interviews.map((item) => item.studentId)].filter(Boolean)), [shortlists, interviews]);
  const activity = useMemo(() => [...shortlists.map((item) => ({ id: `shortlist-${item.id}`, name: item.candidateName, label: 'Candidate shortlisted', date: item.updatedAt || item.shortlistedAt, avatar: item.profilePhoto })), ...interviews.map((item) => ({ id: `interview-${item.id}`, name: item.candidate?.name || 'Candidate', label: statusLabel(item.status), date: item.updatedAt || item.scheduledAt, avatar: item.candidate?.avatar }))].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6), [shortlists, interviews]);

  if (loading) return <DashboardLayout><div className="flex min-h-96 items-center justify-center"><Spinner /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">{profile?.companyName || 'Recruiter workspace'}</p><h1 className="mt-2 text-2xl font-extrabold text-white">Talent acquisition hub</h1><p className="mt-1 text-sm text-slate-400">Manage your candidate workflow, {user?.fullName?.split(' ')[0] || 'there'}.</p></div><button type="button" className="flex items-center gap-2 text-sm font-semibold text-emerald-300 hover:text-emerald-200" onClick={() => navigate('/recruiter/profile')}><UserRound className="h-4 w-4" /> Recruiter profile <ArrowRight className="h-4 w-4" /></button></div>
      {error && <div className="mb-5 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">{error}</div>}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"><StatCard label="Active shortlists" value={shortlists.length} icon={Bookmark} color="emerald" /><StatCard label="Upcoming interviews" value={upcoming.length} icon={CalendarDays} color="blue" /><StatCard label="Candidates viewed" value={engagedCandidateIds.size} icon={Users} color="purple" /><StatCard label="Candidates shortlisted" value={shortlists.length} icon={Activity} color="amber" /></div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2"><SectionCard title="Upcoming interviews" subtitle="Your next scheduled candidate conversations" action={<button type="button" className="flex items-center gap-1 text-xs font-semibold text-emerald-300" onClick={() => navigate('/recruiter/interviews')}>View all <ArrowRight className="h-3 w-3" /></button>}>
          {upcoming.length ? <div className="space-y-3">{upcoming.map((interview) => <button type="button" key={interview.id} className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-left transition hover:border-emerald-500/30" onClick={() => navigate('/recruiter/interviews')}><Avatar name={interview.candidate?.name} src={interview.candidate?.avatar} size="md" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{interview.candidate?.name || 'Candidate'}</p><p className="mt-1 truncate text-xs text-slate-400">{interview.title} · {formatDate(interview.scheduledAt)} · {new Date(interview.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div><Badge variant={interview.status === 'RESCHEDULED' ? 'amber' : 'blue'} size="sm">{interview.status}</Badge></button>)}</div> : <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">No upcoming interviews. Shortlist a candidate to schedule one.</div>}
        </SectionCard></div>
        <SectionCard title="Open recruitment activity" subtitle="Recent changes in your workflow"><div className="space-y-4">{activity.length ? activity.map((item) => <div key={item.id} className="flex items-center gap-3"><Avatar name={item.name} src={item.avatar} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-200">{item.name}</p><p className="text-[11px] text-slate-500">{item.label} · {formatDate(item.date)}</p></div></div>) : <p className="text-sm text-slate-500">No recruitment activity yet.</p>}</div></SectionCard>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3"><ActionCard label="Search talent" desc="Filter the candidate directory" icon={Search} color="emerald" onClick={() => navigate('/recruiter/candidates')} /><ActionCard label="Review shortlists" desc="Open saved candidate profiles" icon={Bookmark} color="blue" onClick={() => navigate('/recruiter/shortlists')} /><ActionCard label="Manage interviews" desc="Schedule or update conversations" icon={CalendarDays} color="amber" onClick={() => navigate('/recruiter/interviews')} /></div>
      <p className="mt-5 text-xs text-slate-600">Candidates viewed is a tracked engagement count derived from candidate records in your shortlist and interview workflow.</p>
    </DashboardLayout>
  );
};

export default RecruiterDashboard;
