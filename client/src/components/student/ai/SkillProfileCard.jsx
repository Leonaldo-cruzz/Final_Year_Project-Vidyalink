import React from 'react';
import { BrainCircuit } from 'lucide-react';

import { SectionCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EvaluationStatus from './EvaluationStatus';
import { asList, formatPercent, getEvaluationDate, getEvaluationVersion } from './helpers';
import { formatDate } from '@/utils/formatters';

const SkillProfileCard = ({ result }) => {
  const skills = Array.isArray(result) ? result : asList(result?.skills);
  const metadata = Array.isArray(result) ? null : result;

  return (
    <SectionCard
      title="Skill Profile"
      subtitle="Skills and the evidence supporting each signal"
      action={<BrainCircuit className="h-4 w-4 text-emerald-400" />}
    >
      {skills.length === 0 ? (
        <p className="text-sm text-slate-500">No persisted skill profile is available yet.</p>
      ) : (
        <div>
          {metadata && <EvaluationStatus result={metadata} />}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill, index) => {
              const confidence = skill?.confidence;
              const confidenceValue = Number(confidence);
              const confidencePercent = Number.isFinite(confidenceValue)
                ? Math.min(100, Math.max(0, confidenceValue * 100))
                : 0;
              const key = `${skill?.name || 'skill'}-${index}`;
              return (
                <div key={key} className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-slate-200">{skill?.name || 'Unnamed skill'}</h4>
                    {skill?.category && <Badge variant="emerald" size="sm">{skill.category}</Badge>}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Confidence</span>
                    <span className="font-bold text-emerald-400">
                      {confidence !== null && confidence !== undefined && Number.isFinite(Number(confidence))
                        ? formatPercent(Number(confidence) * 100)
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${confidencePercent}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {skill?.evidenceCount ?? asList(skill?.evidence).length} evidence items
                    {asList(skill?.sources).length > 0 && ` · ${asList(skill.sources).join(', ')}`}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-5 border-t border-slate-800/60 pt-4 text-xs leading-5 text-slate-500">
            Confidence reflects the evidence found in your connected sources; it is not a guarantee of expertise.
          </p>
          {metadata && (getEvaluationDate(metadata) || getEvaluationVersion(metadata)) && (
            <p className="mt-2 text-xs text-slate-600">
              {getEvaluationDate(metadata) ? `Evaluated ${formatDate(getEvaluationDate(metadata))}` : ''}
              {getEvaluationVersion(metadata) ? ` · Version ${getEvaluationVersion(metadata)}` : ''}
            </p>
          )}
        </div>
      )}
    </SectionCard>
  );
};

export default SkillProfileCard;
