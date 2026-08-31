import React from 'react';
import { BriefcaseBusiness, Clock3, ShieldAlert, Sparkles } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import ScoreBreakdown from './ScoreBreakdown';
import { formatDate } from './ScoreCard';

const IndustryReadinessCard = ({ result }) => {
  const hasResult = result && Number.isFinite(Number(result.score));

  return (
    <Card className="overflow-hidden border-purple-500/20">
      <div className="border-b border-slate-800/70 bg-gradient-to-r from-purple-500/10 to-transparent p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-purple-500/25 bg-purple-500/10 text-purple-300">
              <BriefcaseBusiness className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-300">Industry Readiness</p>
              <h2 className="mt-1 text-lg font-extrabold text-white">Industry Readiness Score</h2>
            </div>
          </div>
          {result?.isStale && <Badge variant="amber" dot>Stale evaluation</Badge>}
        </div>

        {hasResult ? (
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-5xl font-black tracking-tight text-white">{Number(result.score).toFixed(2)}</p>
              <p className="mt-1 text-xs text-slate-500">out of 100</p>
            </div>
            <Badge variant={result.isStale ? 'amber' : 'emerald'} size="md">{result.category || 'Evaluated'}</Badge>
          </div>
        ) : (
          <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
            <ShieldAlert className="h-4 w-4" />
            <span>Not evaluated yet</span>
          </div>
        )}
      </div>

      {hasResult && (
        <div className="space-y-5 p-5">
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> Last evaluated {formatDate(result.evaluatedAt)}</span>
            {result.scoringVersion && <span>Scoring version {result.scoringVersion}</span>}
          </div>
          <ScoreBreakdown breakdown={result.breakdown} title="Readiness component breakdown" />
          {(result.strengths?.length > 0 || result.gaps?.length > 0) && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-400">Top strengths</p>
                <ul className="space-y-2 text-sm text-slate-300">
                  {(result.strengths || []).map((strength) => <li key={strength} className="flex gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />{strength}</li>)}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-400">Focus areas</p>
                <ul className="space-y-2 text-sm text-slate-300">
                  {(result.gaps || []).map((gap) => <li key={gap} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />{gap}</li>)}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default IndustryReadinessCard;
