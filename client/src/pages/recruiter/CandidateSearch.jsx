import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, GitCompareArrows, SlidersHorizontal } from 'lucide-react';
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
  requiredSkills: '',
  minIndustryReadiness: '',
  maxIndustryReadiness: '',
  minPortfolioScore: '',
  maxPortfolioScore: '',
  minATSScore: '',
  maxATSScore: '',
  verifiedOnly: false,
};

const unwrap = (response) => response?.data ?? response;

const CandidateSearch = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState('industryReadiness');
  const [candidates, setCandidates] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [shortlistLoadingId, setShortlistLoadingId] = useState('');
  const [compareIds, setCompareIds] = useState([]);

  const loadCandidates = useCallback(async (activeFilters, page = 1, activeSort = 'industryReadiness') => {
    try {
      setLoading(true);
      setError('');
      const response = await recruiterService.searchCandidates({
        ...activeFilters,
        page,
        limit: 12,
        sortBy: activeSort,
        sortOrder: activeSort === 'name' ? 'asc' : 'desc',
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
    loadCandidates(EMPTY_FILTERS, 1, 'industryReadiness');
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

  const handleCompare = (candidate) => {
    const studentId = candidate.studentId;
    if (compareIds.includes(studentId)) {
      setCompareIds((current) => current.filter((id) => id !== studentId));
      return;
    }
    if (compareIds.length >= 5) {
      setNotice('You can compare up to five candidates at a time.');
      return;
    }
    setCompareIds((current) => [...current, studentId]);
    setNotice(`${candidate.name} added to comparison.`);
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
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-400">{pagination ? `${pagination.total} candidates found` : 'Candidate directory'}</p>
            {compareIds.length > 0 && <span className="text-xs text-slate-500">{compareIds.length}/5 selected</span>}
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            Sort by
            <select className="form-input min-w-44" value={sortBy} onChange={handleSort}>
              <option value="industryReadiness">Industry readiness</option>
              <option value="portfolioScore">Portfolio score</option>
              <option value="atsScore">ATS score</option>
              <option value="updatedAt">Recently updated</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>
        {compareIds.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
          <p className="text-xs text-blue-200">Compare selected candidates using the same persisted AI signals.</p>
          <Button
            type="button"
            size="sm"
            variant="primary"
            leftIcon={GitCompareArrows}
            disabled={compareIds.length < 2}
            onClick={() => navigate(`/recruiter/candidates/compare?ids=${compareIds.join(',')}`)}
          >
            Compare candidates
          </Button>
        </div>}
        <CandidateGrid
          candidates={candidates}
          loading={loading}
          onView={(candidate) => navigate(`/recruiter/candidates/${candidate.studentId}`)}
          onSummary={(candidate) => navigate(`/recruiter/candidates/${candidate.studentId}?tab=ai`)}
          onShortlist={handleShortlist}
          onCompare={handleCompare}
          compareIds={compareIds}
          shortlistLoadingId={shortlistLoadingId}
        />
        <CandidatePagination pagination={pagination} onPageChange={(page) => loadCandidates(filters, page, sortBy)} />
      </div>
    </DashboardLayout>
  );
};

export default CandidateSearch;
