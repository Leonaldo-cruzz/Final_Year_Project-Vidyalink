import React from 'react';
import { ArrowUpRight, Lightbulb } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { formatDate } from './ScoreCard';

const RecommendationList = ({ recommendations = [] }) => (
  <Card className="p-5">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="text-sm font-bold text-white">Recommendations</h2><p className="mt-1 text-xs text-slate-500">Existing AI recommendations from the latest available result set.</p></div>
      {recommendations.length > 0 && <Badge variant="purple" size="sm">{recommendations.length} available</Badge>}
    </div>

    {recommendations.length === 0 ? (
      <p className="mt-5 text-sm text-slate-500">Not evaluated yet</p>
    ) : (
      <div className="mt-5 space-y-3">
        {recommendations.map((recommendation, index) => (
          <div key={`${recommendation.target || recommendation.title || 'recommendation'}-${index}`} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-200">{recommendation.title || recommendation.reasons?.[0] || recommendation.type || 'Recommendation'}</h3>
                  {recommendation.priority && <Badge variant={recommendation.priority === 'HIGH' ? 'rose' : recommendation.priority === 'MEDIUM' ? 'amber' : 'slate'} size="sm">{recommendation.priority}</Badge>}
                </div>
                {recommendation.reasons?.length > 0 && <p className="mt-2 text-sm leading-relaxed text-slate-400">{recommendation.reasons.join(' ')}</p>}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                  {recommendation.matchScore !== null && recommendation.matchScore !== undefined && <span>Match score {Number(recommendation.matchScore).toFixed(0)}%</span>}
                  {recommendation.target && <span className="inline-flex items-center gap-1">Target <ArrowUpRight className="h-3 w-3" /> {recommendation.target}</span>}
                  {recommendation.evaluatedAt && <span>Evaluated {formatDate(recommendation.evaluatedAt)} · v{recommendation.scoringVersion || recommendation.sourceVersion || '—'}</span>}
                  {recommendation.isStale && <span className="text-amber-300">Stale evaluation</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </Card>
);

export default RecommendationList;
