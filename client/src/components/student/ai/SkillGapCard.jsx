import React from 'react';
import { Target } from 'lucide-react';

import { SectionCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EvaluationStatus from './EvaluationStatus';
import { asList, textValue } from './helpers';

const GapList = ({ title, items, variant = 'rose' }) => {
  const values = asList(items);
  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h4>
      {values.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {values.map((item, index) => {
            const name = textValue(item) || `Skill ${index + 1}`;
            const priority = typeof item === 'object' ? item.priority : null;
            const reason = typeof item === 'object' ? item.reason : null;
            const badgeVariant = priority === 'HIGH' ? 'rose' : priority ? 'amber' : variant;
            return (
              <li key={`${name}-${index}`} className="flex items-start justify-between gap-3 rounded-lg bg-slate-950/40 px-3 py-2 text-sm">
                <div>
                  <span className="text-slate-300">{name}</span>
                  {reason && <p className="mt-1 text-xs text-slate-500">{reason}</p>}
                </div>
                {priority && <Badge variant={badgeVariant} size="sm">{priority}</Badge>}
              </li>
            );
          })}
        </ul>
      ) : <p className="mt-2 text-xs text-slate-600">None recorded.</p>}
    </div>
  );
};

const SkillGapCard = ({ result }) => (
  <SectionCard
    title="Skill Gaps"
    subtitle={result?.targetRole ? `Compared with ${result.targetRole}` : 'Persisted comparison against the target role'}
    action={<Target className="h-4 w-4 text-amber-400" />}
  >
    {!result ? (
      <p className="text-sm text-slate-500">No skill-gap analysis is available yet.</p>
    ) : (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-3xl font-extrabold text-amber-400">
              {result.matchPercentage !== null && result.matchPercentage !== undefined
                ? `${Number(result.matchPercentage).toFixed(2)}%`
                : 'N/A'}
            </p>
            <p className="mt-1 text-xs text-slate-500">Matched skills</p>
          </div>
          <EvaluationStatus result={result} />
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <GapList title="Missing required" items={result.missingRequiredSkills} variant="rose" />
          <GapList title="Missing preferred" items={result.missingPreferredSkills} variant="amber" />
          <GapList title="Weak evidence" items={result.weakEvidenceSkills} variant="purple" />
        </div>
        {asList(result.matchedSkills).length > 0 && (
          <div className="border-t border-slate-800/60 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Matched evidence</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {asList(result.matchedSkills).map((skill, index) => (
                <Badge key={`${textValue(skill)}-${index}`} variant="emerald" size="sm">{textValue(skill)}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    )}
  </SectionCard>
);

export default SkillGapCard;
