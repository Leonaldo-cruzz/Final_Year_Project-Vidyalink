import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, ExternalLink, MapPin, Pencil, Video, XCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import Avatar from '@/components/ui/Avatar';
import recruiterService from '@/services/recruiterService';
import { formatDate, getErrorMessage } from '@/utils/formatters';

const unwrap = (response) => response?.data ?? response;
const EMPTY_FORM = { studentId: '', title: 'Candidate interview', description: '', scheduledAt: '', durationMinutes: 45, mode: 'ONLINE', meetingUrl: '', location: '', recruiterNotes: '' };

const localDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
};

const statusLabel = (status) => ({ SCHEDULED: 'Scheduled', RESCHEDULED: 'Rescheduled', COMPLETED: 'Completed', CANCELLED: 'Cancelled', NO_SHOW: 'No show' }[status] || status);
const statusVariant = (status) => ({ SCHEDULED: 'blue', RESCHEDULED: 'amber', COMPLETED: 'emerald', CANCELLED: 'rose', NO_SHOW: 'rose' }[status] || 'slate');

const InterviewForm = ({ form, setForm, editing }) => {
  const update = (change) => setForm((current) => ({ ...current, ...change }));
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {!editing && <Input label="Candidate ID" id="interview-student-id" placeholder="Student ID" value={form.studentId} onChange={(event) => update({ studentId: event.target.value })} required />}
      <Input label="Interview title" id="interview-title" value={form.title} onChange={(event) => update({ title: event.target.value })} required />
      <Input label="Date and time" id="interview-date" type="datetime-local" value={form.scheduledAt} onChange={(event) => update({ scheduledAt: event.target.value })} required />
      <Input label="Duration (minutes)" id="interview-duration" type="number" min="15" max="180" value={form.durationMinutes} onChange={(event) => update({ durationMinutes: event.target.value })} required />
      <div><label htmlFor="interview-mode" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-300">Mode</label><select id="interview-mode" className="form-input" value={form.mode} onChange={(event) => update({ mode: event.target.value })}><option value="ONLINE">Online</option><option value="OFFLINE">In person</option></select></div>
      {form.mode === 'ONLINE' ? <Input label="Meeting URL" id="interview-url" type="url" placeholder="https://…" value={form.meetingUrl} onChange={(event) => update({ meetingUrl: event.target.value })} required /> : <Input label="Location" id="interview-location" placeholder="Office or campus location" value={form.location} onChange={(event) => update({ location: event.target.value })} required />}
      <div className="sm:col-span-2"><label htmlFor="interview-description" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-300">Description</label><textarea id="interview-description" className="form-input min-h-20" value={form.description} onChange={(event) => update({ description: event.target.value })} placeholder="What will this conversation cover?" /></div>
      <div className="sm:col-span-2"><label htmlFor="interview-notes" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-300">Recruiter notes</label><textarea id="interview-notes" className="form-input min-h-20" value={form.recruiterNotes} onChange={(event) => update({ recruiterNotes: event.target.value })} placeholder="Private notes for your team" /></div>
    </div>
  );
};

const Interviews = () => {
  const [searchParams] = useSearchParams();
  const candidateIdFromQuery = searchParams.get('candidateId') || '';
  const [filter, setFilter] = useState('upcoming');
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modalOpen, setModalOpen] = useState(Boolean(candidateIdFromQuery));
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM, studentId: candidateIdFromQuery });
  const [saving, setSaving] = useState(false);

  const loadInterviews = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const status = ['COMPLETED', 'CANCELLED', 'RESCHEDULED'].includes(filter) ? filter : undefined;
      const result = unwrap(await recruiterService.getInterviews({ status, limit: 100 })) || {};
      setInterviews(result.interviews || []);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadInterviews(); }, [loadInterviews]);

  const displayedInterviews = useMemo(() => {
    const now = Date.now();
    const result = filter === 'upcoming'
      ? interviews.filter((interview) => ['SCHEDULED', 'RESCHEDULED'].includes(interview.status) && new Date(interview.scheduledAt).getTime() >= now)
      : interviews;
    return [...result].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  }, [filter, interviews]);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY_FORM, studentId: candidateIdFromQuery }); setModalOpen(true); };
  const openEdit = (interview) => { setEditing(interview); setForm({ ...EMPTY_FORM, studentId: interview.studentId, title: interview.title, description: interview.description || '', scheduledAt: localDateTime(interview.scheduledAt), durationMinutes: interview.durationMinutes, mode: interview.mode, meetingUrl: interview.meetingUrl || '', location: interview.location || '', recruiterNotes: interview.recruiterNotes || '' }); setModalOpen(true); };

  const saveInterview = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError('');
      const payload = { title: form.title, description: form.description || null, scheduledAt: new Date(form.scheduledAt).toISOString(), durationMinutes: Number(form.durationMinutes), mode: form.mode, meetingUrl: form.mode === 'ONLINE' ? form.meetingUrl : null, location: form.mode === 'OFFLINE' ? form.location : null, recruiterNotes: form.recruiterNotes || null };
      if (editing) await recruiterService.rescheduleInterview(editing.id, payload);
      else await recruiterService.scheduleInterview({ ...payload, studentId: form.studentId });
      setNotice(editing ? 'Interview rescheduled.' : 'Interview scheduled.');
      setModalOpen(false);
      await loadInterviews();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (interview) => {
    const reason = window.prompt('Optional cancellation reason:', 'Schedule changed');
    if (reason === null) return;
    try { await recruiterService.cancelInterview(interview.id, reason || undefined); setNotice('Interview cancelled.'); await loadInterviews(); } catch (requestError) { setError(getErrorMessage(requestError)); }
  };

  const complete = async (interview) => {
    if (!window.confirm('Mark this interview as completed?')) return;
    try { await recruiterService.completeInterview(interview.id); setNotice('Interview marked as completed.'); await loadInterviews(); } catch (requestError) { setError(getErrorMessage(requestError)); }
  };

  const tabs = [['upcoming', 'Upcoming'], ['COMPLETED', 'Completed'], ['CANCELLED', 'Cancelled'], ['RESCHEDULED', 'Rescheduled']];
  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-extrabold text-white">Interviews</h1><p className="mt-1 text-sm text-slate-400">Schedule conversations and track each interview state from one place.</p></div><Button type="button" variant="primary" leftIcon={CalendarDays} onClick={openCreate}>Schedule interview</Button></div>
      {notice && <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-300">{notice}</div>}
      {error && <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">{error}</div>}
      <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-800 pb-3">{tabs.map(([key, label]) => <button type="button" key={key} className={`rounded-xl px-3 py-2 text-xs font-semibold ${filter === key ? 'bg-emerald-500/10 text-emerald-300' : 'text-slate-500 hover:text-slate-200'}`} onClick={() => setFilter(key)}>{label}</button>)}</div>
      <SectionCard title={`${tabs.find(([key]) => key === filter)?.[1] || 'Interviews'} interviews`}>
        {loading ? <div className="flex justify-center p-10"><Spinner /></div> : displayedInterviews.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-400">No interviews in this view.</div> : <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{displayedInterviews.map((interview) => <article key={interview.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5"><div className="flex items-start gap-3"><Avatar name={interview.candidate?.name || 'Candidate'} src={interview.candidate?.avatar} size="md" /><div className="min-w-0 flex-1"><h2 className="truncate text-base font-bold text-white">{interview.candidate?.name || 'Candidate'}</h2><p className="mt-1 text-sm text-slate-300">{interview.title}</p></div><Badge variant={statusVariant(interview.status)} size="sm" dot>{statusLabel(interview.status)}</Badge></div><div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-300 sm:grid-cols-2"><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-emerald-400" />{formatDate(interview.scheduledAt)} · {new Date(interview.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div><div className="flex items-center gap-2">{interview.mode === 'ONLINE' ? <Video className="h-4 w-4 text-blue-400" /> : <MapPin className="h-4 w-4 text-amber-400" />}{interview.mode === 'ONLINE' ? `${interview.durationMinutes} min online` : `${interview.durationMinutes} min in person`}</div></div>{interview.mode === 'ONLINE' && interview.meetingUrl && <a className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-300 hover:text-blue-200" href={interview.meetingUrl} target="_blank" rel="noreferrer">Open meeting link <ExternalLink className="h-3 w-3" /></a>}{interview.mode === 'OFFLINE' && interview.location && <p className="mt-3 text-xs text-slate-400">Location: {interview.location}</p>}{interview.recruiterNotes && <p className="mt-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs leading-5 text-slate-400">{interview.recruiterNotes}</p>}<div className="mt-4 flex flex-wrap gap-2">{['SCHEDULED', 'RESCHEDULED'].includes(interview.status) && <><Button type="button" size="sm" variant="secondary" leftIcon={Pencil} onClick={() => openEdit(interview)}>Reschedule</Button><Button type="button" size="sm" variant="danger" leftIcon={XCircle} onClick={() => cancel(interview)}>Cancel</Button><Button type="button" size="sm" variant="success" leftIcon={CheckCircle2} onClick={() => complete(interview)}>Complete</Button></>}</div></article>)}</div>}
      </SectionCard>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Reschedule interview' : 'Schedule interview'} size="lg" footer={<><Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Close</Button><Button type="submit" form="interview-form" loading={saving}>{editing ? 'Save new time' : 'Schedule interview'}</Button></>}>
        <form id="interview-form" onSubmit={saveInterview}><InterviewForm form={form} setForm={setForm} editing={Boolean(editing)} /></form>
      </Modal>
    </DashboardLayout>
  );
};

export default Interviews;
