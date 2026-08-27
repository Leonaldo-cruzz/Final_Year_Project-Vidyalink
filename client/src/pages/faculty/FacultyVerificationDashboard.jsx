import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ClipboardCheck, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import DashboardLayout from '@/layouts/DashboardLayout';
import Button from '@/components/ui/Button';
import Spinner, { FullPageSpinner } from '@/components/ui/Spinner';
import VerificationQueue from '@/components/verification/VerificationQueue';
import VerificationSummaryCards from '@/components/verification/VerificationSummaryCards';
import { getFacultyVerificationDashboard } from '@/services/verificationService';
import { getErrorMessage } from '@/utils/formatters';

const EMPTY_SUMMARY = {
  pendingRequests: 0,
  verifiedToday: 0,
  rejectedToday: 0,
  changesRequested: 0,
  changesRequestedToday: 0,
  averageReviewTimeMinutes: 0,
};

const FacultyVerificationDashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [verifications, setVerifications] = useState([]);
  const [status, setStatus] = useState('ALL');
  const [targetType, setTargetType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('NEWEST');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadDashboard = useCallback(async ({ showSpinner = false } = {}) => {
    try {
      if (showSpinner) setRefreshing(true);
      setError('');
      const response = await getFacultyVerificationDashboard({
        status,
        targetType,
        search,
        sort,
      });
      setSummary(response.data?.summary || EMPTY_SUMMARY);
      setVerifications(response.data?.verificationQueue || []);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to load verification requests'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, sort, status, targetType]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadDashboard(), search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard, search]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (loading) return <FullPageSpinner message="Loading faculty verification dashboard…" />;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                Faculty Verification Dashboard
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Audit student portfolio submissions, verify credentials, and submit official academic decisions.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={RefreshCw}
            loading={refreshing}
            onClick={() => loadDashboard({ showSpinner: true })}
          >
            Refresh
          </Button>
        </header>

        {/* Notices and Alerts */}
        {notice && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 fade-in">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <span>{notice}</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400 fade-in">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 4 Summary Stat Cards (Pending, Verified Today, Rejected Today, Changes Requested) */}
        <VerificationSummaryCards summary={summary} />

        {/* Main Verification Queue with Filters, Search, Sort & Actions */}
        <div className="relative">
          {refreshing && (
            <div className="absolute right-4 top-4 z-10 rounded-lg bg-slate-950/90 p-2 shadow-lg">
              <Spinner size="sm" />
            </div>
          )}
          <VerificationQueue
            verifications={verifications}
            status={status}
            targetType={targetType}
            search={search}
            sort={sort}
            onStatusChange={setStatus}
            onTargetTypeChange={setTargetType}
            onSearchChange={setSearch}
            onSortChange={setSort}
            onReview={(verification) => navigate(`/faculty/verifications/${verification._id}`)}
            onView={(verification) => navigate(`/faculty/verifications/${verification._id}`)}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FacultyVerificationDashboard;
