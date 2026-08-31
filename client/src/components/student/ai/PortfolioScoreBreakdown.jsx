import React from 'react';
import { FileCheck2 } from 'lucide-react';

import { SectionCard } from '@/components/ui/Card';
import { asList, isValidScore, normalizeKey, titleFromKey } from './helpers';

const DIMENSIONS = [
  ['Project Complexity', ['projectComplexity', 'project_complexity', 'complexity']],
  ['Technology Stack', ['technologyStack', 'technology_stack', 'techStack', 'technicalSkills']],
  ['GitHub Activity', ['githubActivity', 'github_activity']],
  ['Documentation Quality', ['documentationQuality', 'documentation_quality']],
  ['Innovation', ['innovation']],
  ['Code Quality', ['codeQuality', 'code_quality']],
];

const findDimension = (breakdown, aliases) => {
  if (!breakdown || typeof breakdown !== 'object') return null;
  const wanted = aliases.map(normalizeKey);
  const entry = Object.entries(breakdown).find(([key]) => wanted.includes(normalizeKey(key)));
  return entry ? entry[1] : null;
};

const ValueLine = ({ label, value }) => {
  if (value === null || value === undefined || value === '') return null;
  const content = Array.isArray(value) ? value.join(', ') : String(value);
  return (
    <div className="flex items-start justify-between gap-4 border-t border-slate-800/50 py-2 first:border-t-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="max-w-[68%] text-right text-xs text-slate-300">{content}</span>
    </div>
  );
};

const PortfolioScoreBreakdown = ({ result }) => {
  const breakdown = result?.breakdown;

  return (
    <SectionCard
      title="Portfolio Score Breakdown"
      subtitle="Persisted evidence from the portfolio evaluation"
      action={<FileCheck2 className="h-4 w-4 text-blue-400" />}
    >
      {!breakdown || typeof breakdown !== 'object' || Object.keys(breakdown).length === 0 ? (
        <p className="text-sm text-slate-500">No persisted portfolio breakdown is available yet.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {DIMENSIONS.map(([label, aliases]) => {
            const dimension = findDimension(breakdown, aliases);
            const value = dimension && typeof dimension === 'object' ? dimension : {};
            const evidence = asList(value.evidence);
            return (
              <div key={label} className="rounded-xl border border-slate-800/60 bg-slate-950/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-sm font-bold text-slate-200">{label}</h4>
                  {isValidScore(value.score) && (
                    <span className="text-sm font-bold text-blue-400">{Number(value.score).toFixed(2)} / 100</span>
                  )}
                </div>
                <div className="mt-3">
                  <ValueLine label="Weight" value={value.weight} />
                  <ValueLine label="Weighted score" value={value.weightedScore ?? value.weighted_score} />
                  <ValueLine label="Explanation" value={value.explanation} />
                  <ValueLine label="Evidence" value={evidence.length ? evidence : null} />
                </div>
                {!dimension && <p className="mt-2 text-xs text-slate-600">No persisted data for this dimension.</p>}
                {dimension && typeof dimension !== 'object' && (
                  <p className="mt-2 text-xs text-slate-400">{titleFromKey(String(dimension))}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
};

export default PortfolioScoreBreakdown;
