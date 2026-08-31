import React, { useEffect, useState } from 'react';
import { AlertCircle, BrainCircuit, RefreshCw, Sparkles } from 'lucide-react';

import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { getErrorMessage } from '@/utils/formatters';
import {
  getStudentAIOverview,
  refreshIndustryReadiness,
} from '@/services/aiService';
import IndustryReadinessCard from '@/components/student/ai/IndustryReadinessCard';
import AIScoreCard from '@/components/student/ai/AIScoreCard';
import PortfolioScoreBreakdown from '@/components/student/ai/PortfolioScoreBreakdown';
import ATSScoreCard from '@/components/student/ai/ATSScoreCard';
import SkillProfileCard from '@/components/student/ai/SkillProfileCard';
import SkillGapCard from '@/components/student/ai/SkillGapCard';
import RecommendationCard from '@/components/student/ai/RecommendationCard';
import GithubAnalyticsCard from '@/components/student/ai/GithubAnalyticsCard';

const unwrapResponse = (payload) => payload?.data ?? payload;

const hasStaleResult = (summary) => [
  summary?.portfolioScore,
  summary?.atsScore,
  summary?.githubAnalytics,
  summary?.skillGaps,
  summary?.industryReadiness,
].some((result) => result?.isStale === true);

const AICareerDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshError, setRefreshError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const loadOverview = async () => {
      setLoading(true);
      setError('');
      try {
        const payload = await getStudentAIOverview();
        if (active) setSummary(unwrapResponse(payload));
      } catch (requestError) {
        if (active) setError(getErrorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    };

    loadOverview();
    return () => { active = false; };
  }, [reloadKey]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshError('');
    setNotice('');
    try {
      await refreshIndustryReadiness(summary?.portfolioId);
      setNotice('Industry Readiness was refreshed.');
      setReloadKey((value) => value + 1);
    } catch (requestError) {
      setRefreshError(getErrorMessage(requestError));
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-slate-400">Loading your persisted AI evaluations…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <SectionCard className="mx-auto max-w-2xl" title="AI Career Intelligence unavailable">
          <div className="flex items-start gap-3 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
          <Button
            type="button"
            className="mt-5"
            leftIcon={RefreshCw}
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Try again
          </Button>
        </SectionCard>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Student workspace</span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold text-white lg:text-3xl">AI Career Intelligence</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            A private view of the latest persisted portfolio, resume, skills, GitHub, and readiness evidence.
          </p>
        </div>
        <Badge variant="blue" size="md">
          <BrainCircuit className="h-3.5 w-3.5" /> Student-only results
        </Badge>
      </div>

      {hasStaleResult(summary) && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-200">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300" />
          <p>Some evaluations are stale because their source data changed. Review the stored results or refresh Industry Readiness when you are ready.</p>
        </div>
      )}
      {notice && <p className="mb-4 text-sm text-emerald-400" role="status">{notice}</p>}
      {refreshError && <p className="mb-4 text-sm text-red-400" role="alert">Refresh failed: {refreshError}</p>}

      <div className="space-y-6">
        <IndustryReadinessCard
          result={summary?.industryReadiness}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <AIScoreCard title="Portfolio score" result={summary?.portfolioScore} color="blue" />
          <AIScoreCard title="ATS resume score" result={summary?.atsScore} color="purple" />
          <AIScoreCard title="GitHub evidence" result={summary?.githubAnalytics} color="emerald" metric="evidence" />
        </div>

        <PortfolioScoreBreakdown result={summary?.portfolioScore} />
        <ATSScoreCard result={summary?.atsScore} />

        <div className="grid gap-6 xl:grid-cols-2">
          <SkillProfileCard result={summary?.skills} />
          <SkillGapCard result={summary?.skillGaps} />
        </div>

        <RecommendationCard recommendations={summary?.recommendations} />
        <GithubAnalyticsCard result={summary?.githubAnalytics} />
      </div>

      <p className="mt-8 text-center text-xs leading-5 text-slate-600">
        AI outputs are generated from persisted VidyaLink evidence and may be incomplete. Keep your portfolio and connected sources current.
      </p>
    </DashboardLayout>
  );
};

export default AICareerDashboard;


