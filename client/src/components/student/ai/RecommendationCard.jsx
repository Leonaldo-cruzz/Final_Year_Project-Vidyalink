import React from 'react';
import { Lightbulb } from 'lucide-react';

import { SectionCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EvaluationStatus from './EvaluationStatus';
import { asList, isValidScore, joinReasons, textValue } from './helpers';

const TYPE_LABELS = {
  ALUMNI_MENTOR: 'Career',
  RECRUITER_OPPORTUNITY: 'Career',
  SKILL_IMPROVEMENT: 'Skill',
  PROJECT_IMPROVEMENT: 'Portfolio',
  RESUME_IMPROVEMENT: 'Resume',
};

const RecommendationCard = ({ recommendations = [] }) => {
  const items = asList(recommendations);
  const generatedResult = items.length > 0 && typeof items[0] === 'object'
    ? { generatedAt: items[0].evaluatedAt || items[0].generatedAt, isStale: items.some((item) => item.isStale) }
    : null;

  return (
    <SectionCard
      title="Recommendations"
      subtitle="Prioritized guidance persisted by the recommendation engine"
      action={<Lightbulb className="h-4 w-4 text-amber-300" />}
    >
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No recommendations are available yet.</p>
      ) : (
        <div>
          {generatedResult && <EvaluationStatus result={generatedResult} />}
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {items.map((recommendation, index) => {
              if (typeof recommendation === 'string') {
                return <div key={`${recommendation}-${index}`} className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-4 text-sm text-slate-300">{recommendation}</div>;
              }
              const type = recommendation?.type || 'Recommendation';
              const reasons = joinReasons(recommendation?.reasons);
              const matched = asList(recommendation?.matchedSkills).map(textValue).filter(Boolean);
              const evidence = asList(recommendation?.matchedEvidence || recommendation?.evidence).map(textValue).filter(Boolean);
              const matchedItems = [...new Set([...matched, ...evidence])];
              return (
                <div key={`${recommendation?.target || type}-${index}`} className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="amber" size="sm">{TYPE_LABELS[type] || type}</Badge>
                    {recommendation?.priority && <Badge variant="slate" size="sm">{recommendation.priority}</Badge>}
                    {isValidScore(recommendation?.matchScore) && (
                      <span className="ml-auto text-xs font-bold text-emerald-400">{Number(recommendation.matchScore).toFixed(0)}% match</span>
                    )}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-200">
                    {recommendation?.target || recommendation?.targetId || 'Career development action'}
                  </p>
                  {reasons.length > 0 && (
                    <ul className="mt-3 space-y-1.5 text-sm text-slate-400">
                      {reasons.map((reason) => <li key={reason}>• {reason}</li>)}
                    </ul>
                  )}
                  {matchedItems.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {matchedItems.map((item) => <Badge key={item} variant="emerald" size="sm">Evidence: {item}</Badge>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </SectionCard>
  );
};

export default RecommendationCard;
