import React from 'react';
import { Activity, FileCheck2, FolderCheck, Info } from 'lucide-react';
import { SectionCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import ScoreCard from './ScoreCard';

const AIOverviewCard = ({ summary, loading = false, error = '', publicView = false }) => {
  if (loading) {
    return (
      <SectionCard title="AI Overview" subtitle="Loading completed evaluation results…">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl border border-slate-800 bg-slate-950/60" />)}
        </div>
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard title="AI Overview" subtitle="Completed evaluation results">
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div><p className="font-semibold">AI service unavailable</p><p className="mt-1 text-rose-200/70">{error}</p></div>
        </div>
      </SectionCard>
    );
  }

  const visibleResults = publicView
    ? [summary?.portfolioScore, summary?.industryReadiness]
    : [summary?.portfolioScore, summary?.atsScore, summary?.githubAnalytics, summary?.industryReadiness];
  const availableCount = visibleResults.filter(Boolean).length;
  const cards = publicView
    ? [
      { title: 'Portfolio Score', result: summary?.portfolioScore, icon: FolderCheck, accent: 'emerald' },
      { title: 'Industry Readiness', result: summary?.industryReadiness, icon: Activity, accent: 'blue' },
    ]
    : [
      { title: 'Portfolio Score', result: summary?.portfolioScore, icon: FolderCheck, accent: 'emerald' },
      { title: 'ATS Score', result: summary?.atsScore, icon: FileCheck2, accent: 'purple' },
      { title: 'Industry Readiness', result: summary?.industryReadiness, icon: Activity, accent: 'blue' },
    ];

  return (
    <SectionCard
      title="AI Overview"
      subtitle="Persisted intelligence results for this verified portfolio"
      action={<Badge variant={availableCount > 0 ? 'emerald' : 'slate'} size="sm">{availableCount} result{availableCount === 1 ? '' : 's'} available</Badge>}
    >
      <div className={`grid gap-4 ${publicView ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
        {cards.map((card) => <ScoreCard key={card.title} {...card} />)}
      </div>
      {summary?.portfolioScore?.isStale || summary?.atsScore?.isStale || summary?.githubAnalytics?.isStale || summary?.industryReadiness?.isStale ? (
        <p className="mt-4 text-xs text-amber-300">One or more evaluations are stale because source data changed after the result was generated.</p>
      ) : (
        <p className="mt-4 text-xs text-slate-500">Scores are read-only persisted results. Missing components are shown as “Not evaluated yet”.</p>
      )}
    </SectionCard>
  );
};

export default AIOverviewCard;
