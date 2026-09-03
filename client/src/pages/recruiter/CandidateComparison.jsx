import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, GitCompareArrows, Plus, RefreshCw, Search } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import CandidateComparisonTable from '@/components/recruiter/CandidateComparisonTable';
import CandidateComparisonCard from '@/components/recruiter/CandidateComparisonCard';
import recruiterService from '@/services/recruiterService';
import { getErrorMessage } from '@/utils/formatters';

const ID_PATTERN = /^[0-9a-fA-F]{24}$/;
const parseIds = (value) => [...new Set(String(value || '').split(',').map((id) => id.trim()).filter(Boolean))].slice(0, 5);
const unwrap = (response) => response?.data ?? response;

const CandidateComparison = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [candidateIds, setCandidateIds] = useState(() => parseIds(searchParams.get('ids')));
  const [candidateIdInput, setCandidateIdInput] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [shortlistLoadingId, setShortlistLoadingId] = useState('');

  const loadComparison = useCallback(async (ids) => {
    if (ids.length < 2) {
      setCandidates([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const response = await recruiterService.compareCandidates(ids);
      const result = unwrap(response) || {};
      setCandidates(Array.isArray(result) ? result : result.candidates || []);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const queryIds = parseIds(searchParams.get('ids'));
    setCandidateIds((current) => (current.join(',') === queryIds.join(',') ? current : queryIds));
  }, [searchParams]);

  useEffect(() => {
    loadComparison(candidateIds);
  }, [candidateIds, loadComparison]);

  const syncIds = (ids) => {
    setCandidateIds(ids);
    setSearchParams(ids.length ? { ids: ids.join(',') } : {});
  };

  const addCandidate = (event) => {
    event.preventDefault();
    const id = candidateIdInput.trim();
    if (!ID_PATTERN.test(id)) {
      setError('Enter a valid 24-character candidate ID.');
      return;
    }
    if (candidateIds.includes(id)) {
      setError('That candidate is already in the comparison.');
      return;
    }
    if (candidateIds.length >= 5) {
      setError('You can compare up to five candidates at a time.');
      return;
    }
    setError('');
    setNotice('Candidate added.');
    setCandidateIdInput('');
    syncIds([...candidateIds, id]);
  };

  const removeCandidate = (id) => {
    setNotice('Candidate removed from comparison.');
    syncIds(candidateIds.filter((candidateId) => candidateId !== id));
  };

  const handleShortlist = async (candidate) => {
    try {
      setShortlistLoadingId(candidate.studentId);
      await recruiterService.addShortlist(candidate.studentId);
      setNotice(`${candidate.name} was added to your shortlist.`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setShortlistLoadingId('');
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Button type="button" variant="ghost" size="sm" leftIcon={ArrowLeft} onClick={() => navigate('/recruiter/candidates')}>Find candidates</Button>
          <h1 className="mt-3 text-2xl font-extrabold text-white">Compare candidates</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">Review public profile evidence and persisted AI signals side by side. Comparison does not create a hiring decision.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" leftIcon={RefreshCw} loading={loading} disabled={candidateIds.length < 2} onClick={() => loadComparison(candidateIds)}>Refresh</Button>
      </div>

      {notice && <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-300">{notice}</div>}
      {error && <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">{error}</div>}

      <section className="mb-5 rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-sm font-bold text-white">Add candidate</h2><p className="mt-1 text-xs text-slate-500">Paste a candidate ID from the search results. Compare two to five candidates.</p></div>
          <span className="text-xs text-slate-500">{candidateIds.length}/5 selected</span>
        </div>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={addCandidate}>
          <div className="min-w-0 flex-1"><Input id="comparison-candidate-id" label="Candidate ID" placeholder="24-character candidate ID" value={candidateIdInput} onChange={(event) => setCandidateIdInput(event.target.value)} /></div>
          <Button type="submit" variant="primary" leftIcon={Plus} disabled={candidateIds.length >= 5}>Add candidate</Button>
        </form>
      </section>

      {candidateIds.length < 2 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 p-12 text-center">
          <GitCompareArrows className="mx-auto h-8 w-8 text-slate-600" />
          <h2 className="mt-3 text-base font-bold text-white">Select at least two candidates</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Use Compare on candidate cards or add another candidate ID to start a side-by-side review.</p>
          <Button type="button" className="mt-5" variant="secondary" leftIcon={Search} onClick={() => navigate('/recruiter/candidates')}>Find candidates</Button>
        </div>
      ) : loading ? (
        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-800/70 bg-slate-900/40 text-sm text-slate-400"><Spinner /> <span className="ml-3">Loading comparison…</span></div>
      ) : candidates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 p-12 text-center text-sm text-slate-500">No public student profiles were found for these IDs.</div>
      ) : (
        <div className="space-y-4">
          <CandidateComparisonTable candidates={candidates} onView={(candidate) => navigate(`/recruiter/candidates/${candidate.studentId}`)} onRemove={removeCandidate} onShortlist={handleShortlist} shortlistLoadingId={shortlistLoadingId} />
          <div className="grid grid-cols-1 gap-4 lg:hidden">
            {candidates.map((candidate) => <CandidateComparisonCard key={candidate.studentId} candidate={candidate} onView={(item) => navigate(`/recruiter/candidates/${item.studentId}`)} onRemove={removeCandidate} onShortlist={handleShortlist} shortlistLoading={shortlistLoadingId === candidate.studentId} />)}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default CandidateComparison;
