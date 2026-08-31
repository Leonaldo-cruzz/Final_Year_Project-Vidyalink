import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import Button from '@/components/ui/Button';
import CandidateSearchBar from '@/components/recruiter/CandidateSearchBar';
import CandidateFilters from '@/components/recruiter/CandidateFilters';
import CandidateGrid from '@/components/recruiter/CandidateGrid';
import CandidatePagination from '@/components/recruiter/CandidatePagination';
import recruiterService from '@/services/recruiterService';
import { getErrorMessage } from '@/utils/formatters';

const EMPTY_FILTERS = {
  search: '',
  skills: '',
  branch: '',
  college: '',
  domain: '',
  graduationYear: '',
  verificationStatus: '',
  minPortfolioScore: '',
  maxPortfolioScore: '',
};

const unwrap = (response) => response?.data ?? response;

const CandidateSearch = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState('relevance');
  const [candidates, setCandidates] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [shortlistLoadingId, setShortlistLoadingId] = useState('');

  const loadCandidates = useCallback(async (activeFilters, page = 1, activeSort = 'relevance') => {
    try {
      setLoading(true);
      setError('');
      const response = await recruiterService.searchCandidates({
        ...activeFilters,
        page,
        limit: 12,
        sortBy: activeSort,
        sortOrder: activeSort === 'name' || activeSort === 'graduationYear' ? 'asc' : 'desc',
      });
      const result = unwrap(response) || {};
      setCandidates(result.candidates || []);
      setPagination(result.pagination || null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setCandidates([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCandidates(EMPTY_FILTERS, 1, 'relevance');
  }, [loadCandidates]);

  const updateFilters = (change) => setFilters((current) => ({ ...current, ...change }));

  const applyFilters = () => loadCandidates(filters, 1, sortBy);

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    loadCandidates(EMPTY_FILTERS, 1, sortBy);
  };

  const handleSort = (event) => {
    const nextSort = event.target.value;
    setSortBy(nextSort);
    loadCandidates(filters, 1, nextSort);
  };

  const handleShortlist = async (candidate) => {
    try {
      setShortlistLoadingId(candidate.studentId);
      setNotice('');
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
      <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Button type="button" variant="ghost" size="sm" leftIcon={ArrowLeft} onClick={() => navigate('/recruiter')}>Dashboard</Button>
          <h1 className="mt-3 text-2xl font-extrabold text-white">Find candidates</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">Search verified academic talent using profile data, public portfolio evidence, and the existing candidate directory.</p>
        </div>
        <Button type="button" variant="secondary" leftIcon={SlidersHorizontal} onClick={() => document.getElementById('candidate-filters')?.scrollIntoView({ behavior: 'smooth' })}>Filters</Button>
      </div>

      {notice && <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-300">{notice}</div>}
      {error && <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">{error}</div>}

      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5">
          <CandidateSearchBar value={filters} onChange={updateFilters} onSubmit={applyFilters} loading={loading} />
        </div>
        <div id="candidate-filters">
          <CandidateFilters value={filters} onChange={updateFilters} onApply={applyFilters} onReset={resetFilters} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-400">{pagination ? `${pagination.total} candidates found` : 'Candidate directory'}</p>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            Sort by
            <select className="form-input min-w-44" value={sortBy} onChange={handleSort}>
              <option value="relevance">Relevance</option>
              <option value="name">Name</option>
              <option value="portfolioScore">Portfolio score</option>
              <option value="graduationYear">Graduation year</option>
              <option value="recentlyUpdated">Recently updated</option>
            </select>
          </label>
        </div>
        <CandidateGrid
          candidates={candidates}
          loading={loading}
          onView={(candidate) => navigate(`/recruiter/candidates/${candidate.studentId}`)}
          onSummary={(candidate) => navigate(`/recruiter/candidates/${candidate.studentId}?tab=ai`)}
          onShortlist={handleShortlist}
          shortlistLoadingId={shortlistLoadingId}
        />
        <CandidatePagination pagination={pagination} onPageChange={(page) => loadCandidates(filters, page, sortBy)} />
      </div>
    </DashboardLayout>
  );
};

export default CandidateSearch;
