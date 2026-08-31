import React from 'react';
import { BookOpenCheck, Clock3 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { formatDate } from './ScoreCard';

const SkillEvidence = ({ profile, skills = [], verifiedOnly = false }) => {
  const items = profile?.skills || skills;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-white">Skill Profile</h2>
          <p className="mt-1 text-xs text-slate-500">Evidence-backed signals from the completed AI analysis.</p>
        </div>
        {profile?.isStale && <Badge variant="amber" size="sm" dot>Stale</Badge>}
      </div>

      {items.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">Not evaluated yet</p>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {items.map((skill) => {
            const confidence = Math.max(0, Math.min(100, Number(skill.confidence || 0) * 100));
            return (
              <div key={`${skill.name}-${skill.category || 'skill'}`} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BookOpenCheck className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-semibold text-slate-200">{skill.name}</span>
                  </div>
                  {!verifiedOnly && <span className="text-sm font-bold text-blue-300">{confidence.toFixed(0)}%</span>}
                </div>
                {!verifiedOnly && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-blue-400" style={{ width: `${confidence}%` }} /></div>}
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                  <span>{verifiedOnly ? 'Verified portfolio evidence' : `${Number(skill.evidenceCount || 0)} evidence signal${Number(skill.evidenceCount || 0) === 1 ? '' : 's'}`}</span>
                  {skill.sources?.length > 0 && <span>{skill.sources.join(' + ')}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {profile?.evaluatedAt && <p className="mt-4 inline-flex items-center gap-1 text-[11px] text-slate-500"><Clock3 className="h-3 w-3" /> Last evaluated {formatDate(profile.evaluatedAt)} · v{profile.scoringVersion || profile.sourceVersion || '—'}</p>}
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{verifiedOnly ? 'Only skills explicitly attached to the public verified portfolio are shown.' : 'Confidence reflects evidence found in the analyzed sources; it is not a professional certification or guarantee of proficiency.'}</p>
    </Card>
  );
};

export default SkillEvidence;
