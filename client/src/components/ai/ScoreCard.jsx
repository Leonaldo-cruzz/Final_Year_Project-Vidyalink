import React from 'react';
import { Clock3, ShieldAlert, Sparkles } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';

const ACCENTS = {
  blue: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
  emerald: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
  purple: 'text-purple-400 border-purple-500/20 bg-purple-500/10',
  amber: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
};

const formatDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString();
};

const ScoreCard = ({ title, result, icon: Icon = Sparkles, accent = 'blue', compact = false }) => {
  const accentClasses = ACCENTS[accent] || ACCENTS.blue;
  const hasScore = result && Number.isFinite(Number(result.score));

  return (
    <Card className={`p-4 ${compact ? '' : 'min-h-[150px]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${accentClasses}`}>
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">{title}</h3>
        </div>
        {result?.isStale && (
          <Badge variant="amber" size="sm" dot>Stale</Badge>
        )}
      </div>

      {hasScore ? (
        <div className="mt-5">
          <div className="flex items-end justify-between gap-3">
            <p className="text-3xl font-extrabold text-white">{Number(result.score).toFixed(2)}<span className="text-base text-slate-500">/100</span></p>
            {result.category && <Badge variant={result.isStale ? 'amber' : 'emerald'} size="sm">{result.category}</Badge>}
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div className={`h-full rounded-full ${result.isStale ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.max(0, Math.min(100, Number(result.score)))}%` }} />
          </div>
        </div>
      ) : (
        <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
          <ShieldAlert className="h-4 w-4" />
          <span>Not evaluated yet</span>
        </div>
      )}

      {hasScore && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> {formatDate(result.evaluatedAt)}</span>
          {result.scoringVersion && <span>v{result.scoringVersion}</span>}
        </div>
      )}
    </Card>
  );
};

export { formatDate };
export default ScoreCard;
