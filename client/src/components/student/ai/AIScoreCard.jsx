import React from 'react';
import { BarChart3 } from 'lucide-react';

import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EvaluationStatus from './EvaluationStatus';
import { isValidScore } from './helpers';

const COLOR_STYLES = {
  blue: { icon: 'bg-blue-500/10 text-blue-400 border-blue-500/20', score: 'text-blue-400' },
  emerald: { icon: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', score: 'text-emerald-400' },
  purple: { icon: 'bg-purple-500/10 text-purple-400 border-purple-500/20', score: 'text-purple-400' },
  amber: { icon: 'bg-amber-500/10 text-amber-400 border-amber-500/20', score: 'text-amber-400' },
};

const AIScoreCard = ({
  title,
  result,
  icon: Icon = BarChart3,
  color = 'blue',
  metric = 'score',
}) => {
  const style = COLOR_STYLES[color] || COLOR_STYLES.blue;
  const score = result?.score;
  const evidence = metric === 'evidence' && result;

  return (
    <Card className="p-5 card-hover">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{title}</p>
          <p className={`mt-3 text-3xl font-extrabold ${style.score}`}>
            {isValidScore(score) ? `${Number(score).toFixed(2)} / 100` : evidence ? 'Analyzed' : 'N/A'}
          </p>
          {result?.category && <Badge variant={color} size="sm" className="mt-3">{result.category}</Badge>}
          {metric === 'evidence' && result && (
            <p className="mt-2 text-xs text-slate-400">
              {result.repositoryCount ?? 0} repositories · {result.recentCommitCount ?? 0} recent commits
            </p>
          )}
        </div>
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${style.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-5 border-t border-slate-800/60 pt-3">
        <EvaluationStatus result={result} />
      </div>
    </Card>
  );
};

export default AIScoreCard;
