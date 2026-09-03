import React, { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, CalendarDays, Eye, FileText, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import recruiterService from '@/services/recruiterService';
import { formatDate, getErrorMessage } from '@/utils/formatters';

const unwrap = (response) => response?.data ?? response;

const Shortlists = () => {
  const navigate = useNavigate();
  const [shortlists, setShortlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [removingId, setRemovingId] = useState('');

  const loadShortlists = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = unwrap(await recruiterService.getShortlists({ status: 'SHORTLISTED', limit: 100 })) || {};
      setShortlists(result.shortlists || []);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadShortlists(); }, [loadShortlists]);

  const remove = async (studentId) => {
    if (!window.confirm('Remove this candidate from your active shortlist?')) return;
    try {
      setRemovingId(studentId);
      await recruiterService.removeShortlist(studentId);
      setShortlists((current) => current.filter((entry) => entry.studentId !== studentId));
      setNotice('Candidate removed from the active shortlist.');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setRemovingId('');
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-extrabold text-white">Shortlisted candidates</h1><p className="mt-1 text-sm text-slate-400">Your saved candidates and recruiter notes, backed by the shortlist workflow.</p></div>
        <Button type="button" variant="primary" onClick={() => navigate('/recruiter/candidates')}>Find more candidates</Button>
      </div>
      {notice && <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-300">{notice}</div>}
      {error && <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">{error}</div>}
      <SectionCard title="Active shortlist" subtitle={`${shortlists.length} active candidate${shortlists.length === 1 ? '' : 's'}`}>
        {loading ? <div className="flex justify-center p-10"><Spinner /></div> : shortlists.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-400">Your shortlist is empty. Add candidates from the directory to begin your hiring workflow.</div> : <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{shortlists.map((entry) => <article key={entry.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5"><div className="flex items-start gap-3"><Avatar name={entry.candidateName} src={entry.profilePhoto} size="lg" /><div className="min-w-0 flex-1"><h2 className="truncate text-base font-bold text-white">{entry.candidateName}</h2><p className="mt-1 truncate text-xs text-slate-400">{entry.college} · {entry.branch}</p><p className="mt-1 text-xs text-slate-500">Shortlisted {formatDate(entry.shortlistedAt)}</p></div><Badge variant="emerald" size="sm" dot>Shortlisted</Badge></div><div className="mt-4 flex flex-wrap gap-1.5">{(entry.skills || []).slice(0, 6).map((skill) => <Badge key={skill} variant="slate" size="sm">{skill}</Badge>)}</div><div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3">{entry.notes ? <p className="text-sm leading-6 text-slate-300"><FileText className="mr-2 inline h-4 w-4 text-amber-300" />{entry.notes}</p> : <p className="text-xs text-slate-500">No recruiter notes added.</p>}</div><div className="mt-4 flex flex-wrap gap-2"><Button type="button" size="sm" variant="secondary" leftIcon={Eye} onClick={() => navigate(`/recruiter/candidates/${entry.studentId}`)}>View profile</Button><Button type="button" size="sm" variant="primary" leftIcon={CalendarDays} onClick={() => navigate(`/recruiter/interviews?candidateId=${entry.studentId}`)}>Schedule</Button><Button type="button" size="sm" variant="danger" loading={removingId === entry.studentId} leftIcon={Trash2} onClick={() => remove(entry.studentId)}>Remove</Button></div></article>)}</div>}
      </SectionCard>
      <p className="mt-4 text-xs text-slate-600"><ArrowUpRight className="mr-1 inline h-3 w-3" />Shortlist state is managed by the recruiter API and can be reactivated later.</p>
    </DashboardLayout>
  );
};

export default Shortlists;

