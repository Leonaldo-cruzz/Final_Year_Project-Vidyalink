import React from 'react';
import { Gauge, ShieldCheck } from 'lucide-react';

import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EvaluationStatus from './EvaluationStatus';
import { asList, isValidScore, titleFromKey } from './helpers';

const DIMENSION_NAMES = {
  portfolioQuality: 'Portfolio Quality',
  technicalSkillProfile: 'Technical Skill Profile',
  githubEvidence: 'GitHub Evidence',
  atsReadiness: 'ATS Readiness',
  verifiedAchievements: 'Verified Achievements',
  careerAlignment: 'Career Alignment',
};

const IndustryReadinessCard = ({ result, onRefresh, refreshing = false }) => {
  const score = result?.score ?? result?.industryReadinessScore;
  const breakdown = result?.breakdown && typeof result.breakdown === 'object' ? result.breakdown : {};
  const hasResult = isValidScore(score);

  return (
    <Card className="relative overflow-hidden border-blue-500/20 bg-gradient-to-br from-blue-950/70 via-slate-900/80 to-purple-950/50 p-6 lg:p-8">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-500/10 text-blue-300">
              <Gauge className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">AI Career Intelligence</p>
              <h2 className="mt-1 text-xl font-extrabold text-white">Industry Readiness</h2>
            </div>
          </div>
          <p className="mt-5 text-5xl font-black tracking-tight text-white">
            {hasResult ? `${Number(score).toFixed(2)} / 100` : 'Not evaluated'}
          </p>
          {result?.category && <Badge variant="blue" className="mt-4">{result.category}</Badge>}
          {!hasResult && (
            <p className="mt-4 max-w-xl text-sm text-slate-400">Your portfolio has not been evaluated yet.</p>
          )}
          <div className="mt-5">
            <EvaluationStatus result={result} onRefresh={onRefresh} refreshing={refreshing} />
          </div>
          <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-400">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-300" />
            <span>Industry Readiness is an evidence-based assessment signal, not a guarantee of employment.</span>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">Readiness dimensions</h3>
            <span className="text-xs text-slate-500">Backend-weighted</span>
          </div>
          {Object.keys(breakdown).length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700/70 bg-slate-950/30 p-5 text-sm text-slate-500">
              Dimension scores will appear after an evaluation is persisted.
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(breakdown).map(([key, value]) => {
                const dimension = value && typeof value === 'object' ? value : {};
                const dimensionScore = dimension.score;
                const title = DIMENSION_NAMES[key] || titleFromKey(key);
                return (
                  <div key={key} className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-300">{title}</span>
                      <span className="text-sm font-bold text-blue-300">
                        {isValidScore(dimensionScore) ? `${Number(dimensionScore).toFixed(2)} / 100` : 'N/A'}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      <span>Weight: {dimension.weight ?? 'N/A'}</span>
                      <span>Weighted: {dimension.weightedScore ?? 'N/A'}</span>
                    </div>
                    {asList(dimension.evidence).length > 0 && (
                      <p className="mt-2 text-xs text-slate-400">{asList(dimension.evidence).join(' · ')}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default IndustryReadinessCard;
