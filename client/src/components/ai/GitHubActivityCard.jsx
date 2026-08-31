import React from 'react';
import { Activity, GitBranch, Star } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { formatDate } from './ScoreCard';

const GitHubActivityCard = ({ analytics }) => (
  <Card className="p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-emerald-400" /><h2 className="text-sm font-bold text-white">GitHub Activity</h2></div>
      {analytics?.isStale && <Badge variant="amber" size="sm" dot>Stale</Badge>}
    </div>
    {!analytics ? (
      <p className="mt-5 text-sm text-slate-500">Not analyzed yet</p>
    ) : (
      <>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><p className="text-xl font-bold text-white">{analytics.repositoryCount}</p><p className="text-[11px] text-slate-500">Repositories</p></div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><p className="text-xl font-bold text-white">{analytics.commitCount}</p><p className="text-[11px] text-slate-500">Total commits</p></div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><p className="text-xl font-bold text-white">{analytics.recentCommitCount}</p><p className="text-[11px] text-slate-500">Recent commits</p></div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><p className="text-xl font-bold text-white">{analytics.totalStars}<Star className="ml-1 inline h-4 w-4 text-amber-400" /></p><p className="text-[11px] text-slate-500">Stars</p></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5"><GitBranch className="h-3.5 w-3.5 text-emerald-400" /> {analytics.languages?.join(', ') || 'Languages not available'}</span>
          <span>Recent activity {formatDate(analytics.recentActivityDate)}</span>
        </div>
        {analytics.evaluatedAt && <p className="mt-3 text-[11px] text-slate-500">Last evaluated {formatDate(analytics.evaluatedAt)} · v{analytics.scoringVersion || analytics.sourceVersion || '—'}</p>}
      </>
    )}
  </Card>
);

export default GitHubActivityCard;
