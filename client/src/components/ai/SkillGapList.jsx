import React from 'react';
import { AlertTriangle, Target } from 'lucide-react';
import Card from '@/components/ui/Card';
import { formatDate } from './ScoreCard';

const GapGroup = ({ title, items, tone = 'amber', weak = false }) => {
  const toneClass = tone === 'rose' ? 'text-rose-300 bg-rose-500/10 border-rose-500/20' : 'text-amber-300 bg-amber-500/10 border-amber-500/20';
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
        {weak ? <AlertTriangle className="h-4 w-4" /> : <Target className="h-4 w-4" />}
        {title}
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">None identified</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm text-slate-300">
          {items.map((item) => {
            const label = typeof item === 'string' ? item : item.name;
            const reason = typeof item === 'object' ? item.reason : null;
            return <li key={label} className="flex items-start justify-between gap-3"><span>{label}</span>{reason && <span className="text-right text-xs text-slate-500">{reason}</span>}</li>;
          })}
        </ul>
      )}
    </div>
  );
};

const SkillGapList = ({ gaps }) => {
  if (!gaps) {
    return <Card className="p-5"><h2 className="text-sm font-bold text-white">Skill Gaps</h2><p className="mt-4 text-sm text-slate-500">Not evaluated yet</p></Card>;
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div><h2 className="text-sm font-bold text-white">Skill Gaps</h2><p className="mt-1 text-xs text-slate-500">Role alignment: {gaps.targetRole || 'Not specified'}</p></div>
        {gaps.isStale && <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">Stale</span>}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <GapGroup title="Missing required skills" items={gaps.missingRequiredSkills || []} tone="rose" />
        <GapGroup title="Missing preferred skills" items={gaps.missingPreferredSkills || []} />
        <GapGroup title="Weak evidence skills" items={gaps.weakEvidenceSkills || []} weak />
      </div>
      {gaps.evaluatedAt && <p className="mt-4 text-[11px] text-slate-500">Last evaluated {formatDate(gaps.evaluatedAt)} · v{gaps.scoringVersion || gaps.sourceVersion || '—'}</p>}
    </Card>
  );
};

export default SkillGapList;
