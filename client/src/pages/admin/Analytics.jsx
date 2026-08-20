import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { getActivityAnalytics, getAdminOverview, getProjectAnalytics, getRecruitmentAnalytics, getVerificationAnalytics } from '@/services/adminService';
import { getErrorMessage } from '@/utils/formatters';
import AnalyticsSummaryCards from '@/components/admin/AnalyticsSummaryCards';
import UserGrowthChart from '@/components/admin/UserGrowthChart';
import VerificationChart from '@/components/admin/VerificationChart';
import ProjectAnalyticsChart from '@/components/admin/ProjectAnalyticsChart';
import RecruitmentAnalyticsChart from '@/components/admin/RecruitmentAnalyticsChart';
import ActivityChart from '@/components/admin/ActivityChart';

const isoDate = (date) => date.toISOString().slice(0, 10);
const defaultRange = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 29);
  return { from: isoDate(from), to: isoDate(to) };
};

const Analytics = () => {
  const [range, setRange] = useState(defaultRange);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadAnalytics = useCallback(async ({ manual = false } = {}) => {
    try {
      if (manual) setRefreshing(true);
      else setLoading(true);
      setError('');
      const [overview, verification, projects, recruitment, activity] = await Promise.all([
        getAdminOverview(), getVerificationAnalytics(range), getProjectAnalytics(range), getRecruitmentAnalytics(), getActivityAnalytics(range),
      ]);
      setData({ overview: overview.data, verification: verification.data, projects: projects.data, recruitment: recruitment.data, activity: activity.data });
      setLastUpdated(new Date());
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to load analytics.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range]);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  const handleRangeSubmit = (event) => {
    event.preventDefault();
    if (range.from > range.to) {
      setError('The start date must be on or before the end date.');
      return;
    }
    loadAnalytics({ manual: true });
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div><h1 className="text-2xl font-extrabold text-white">Platform analytics</h1><p className="mt-1 text-sm text-slate-400">Database-backed activity and operational metrics.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end"><form onSubmit={handleRangeSubmit} className="flex flex-wrap items-end gap-2"><label className="text-xs text-slate-500">From<input type="date" value={range.from} max={range.to} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} className="form-input mt-1 h-9" /></label><label className="text-xs text-slate-500">To<input type="date" value={range.to} min={range.from} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} className="form-input mt-1 h-9" /></label><Button type="submit" size="sm" variant="secondary">Apply range</Button></form><Button size="sm" leftIcon={RefreshCw} loading={refreshing} onClick={() => loadAnalytics({ manual: true })}>Refresh</Button></div>
        </div>
        {lastUpdated && <p className="text-xs text-slate-500">Last updated {lastUpdated.toLocaleString('en-IN')}</p>}
        {error && <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        {loading && !data ? <div className="flex min-h-64 items-center justify-center"><Spinner size="lg" /></div> : data && <div className="space-y-6"><AnalyticsSummaryCards {...data} /><UserGrowthChart data={data.activity?.series?.registrations} /><VerificationChart analytics={data.verification} /><ProjectAnalyticsChart analytics={data.projects} /><RecruitmentAnalyticsChart analytics={data.recruitment} /><ActivityChart activity={data.activity} /><p className="text-xs text-slate-500">Metrics marked unavailable are not persisted by the current platform schema; no synthetic values are shown.</p></div>}
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
