import React from 'react';
import { FileText, ListChecks } from 'lucide-react';

import { SectionCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EvaluationStatus from './EvaluationStatus';
import { asList, isValidScore, joinReasons, textValue } from './helpers';

const ItemList = ({ title, items, empty = 'None recorded' }) => {
  const values = asList(items).map(textValue).filter(Boolean);
  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h4>
      {values.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map((item) => <Badge key={item} variant="slate" size="sm">{item}</Badge>)}
        </div>
      ) : <p className="mt-2 text-xs text-slate-600">{empty}</p>}
    </div>
  );
};

const ATSScoreCard = ({ result }) => {
  const sections = result?.resumeSections || result?.sections || result?.breakdown?.resumeSections || null;
  const recommendations = joinReasons(result?.recommendations);

  return (
    <SectionCard
      title="ATS Resume Evaluation"
      subtitle="Persisted resume analysis and actionable evidence"
      action={<FileText className="h-4 w-4 text-purple-400" />}
    >
      {!result ? (
        <p className="text-sm text-slate-500">Your resume has not been evaluated yet.</p>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-3xl font-extrabold text-purple-400">
                {isValidScore(result.score) ? `${Number(result.score).toFixed(2)} / 100` : 'N/A'}
              </p>
              {result.category && <Badge variant="purple" size="sm" className="mt-2">{result.category}</Badge>}
            </div>
            <EvaluationStatus result={result} />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <ItemList title="Matched keywords" items={result.matchedKeywords} />
            <ItemList title="Missing keywords" items={result.missingKeywords} />
            <ItemList title="Detected skills" items={result.detectedSkills || result.matchedSkills} />
            <ItemList title="Missing skills" items={result.missingSkills} />
          </div>
          <div className="grid gap-5 border-t border-slate-800/60 pt-5 md:grid-cols-2">
            <div>
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <ListChecks className="h-4 w-4 text-purple-400" /> Resume sections
              </h4>
              {sections && typeof sections === 'object' && Object.keys(sections).length > 0 ? (
                <div className="mt-2 space-y-2">
                  {Object.entries(sections).map(([name, value]) => (
                    <div key={name} className="flex items-start justify-between gap-3 text-xs">
                      <span className="text-slate-400">{name}</span>
                      <span className="text-right text-slate-300">{textValue(value) || String(value)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="mt-2 text-xs text-slate-600">No resume-section detail recorded.</p>}
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Recommendations</h4>
              {recommendations.length > 0 ? (
                <ul className="mt-2 space-y-2 text-sm text-slate-300">
                  {recommendations.map((recommendation) => <li key={recommendation}>• {recommendation}</li>)}
                </ul>
              ) : <p className="mt-2 text-xs text-slate-600">No recommendations recorded.</p>}
            </div>
          </div>
          <p className="border-t border-slate-800/60 pt-4 text-xs leading-5 text-slate-500">
            ATS scores estimate machine-readable resume alignment. They are not a hiring decision or a guarantee of interview selection.
          </p>
        </div>
      )}
    </SectionCard>
  );
};

export default ATSScoreCard;
