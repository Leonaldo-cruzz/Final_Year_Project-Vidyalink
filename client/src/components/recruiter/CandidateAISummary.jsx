import React from 'react';
import { AlertCircle, BrainCircuit, Code2 as Github, Lightbulb, ShieldCheck, Target } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';

const SCORE_COLORS = {
  emerald: { icon: 'text-emerald-400', value: 'text-emerald-300' },
  blue: { icon: 'text-blue-400', value: 'text-blue-300' },
  purple: { icon: 'text-purple-400', value: 'text-purple-300' },
  amber: { icon: 'text-amber-400', value: 'text-amber-300' },
};

const Score = ({ label, value, icon: Icon, color = 'emerald', suffix = '%' }) => {
  const available = value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  const colors = SCORE_COLORS[color] || SCORE_COLORS.emerald;
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500">{label}</span>
        <Icon className={`h-4 w-4 ${colors.icon}`} />
      </div>
      <p className={`mt-2 text-2xl font-extrabold ${available ? colors.value : 'text-slate-500'}`}>
        {available ? `${Number(value)}${suffix}` : 'Not available'}
      </p>
    </div>
  );
};

const CandidateAISummary = ({ summary, loading = false, error = '' }) => {
  if (loading) {
    return <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-sm text-slate-400"><Spinner /> Loading AI evidence…</div>;
  }

  if (error) {
    return <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm text-amber-200"><AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /><span>{error}</span></div>;
  }

  if (!summary) {
    return <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">No public AI evaluation is available for this candidate yet.</div>;
  }

  const strengths = summary.topStrengths || [];
  const gaps = summary.topGaps || [];
  const recommendations = summary.industryReadiness?.topRecommendations || [];
  const github = summary.githubAnalyticsSummary;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Score label="Portfolio score" value={summary.portfolioScore?.score} icon={ShieldCheck} />
        <Score label="ATS score" value={summary.atsScore?.score} icon={Target} color="blue" />
        <Score label="GitHub activity" value={summary.githubAnalyticsSummary?.repositoryCount} icon={Github} color="purple" suffix=" repos" />
        <Score label="Industry readiness" value={summary.industryReadiness?.score} icon={BrainCircuit} color="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white"><ShieldCheck className="h-4 w-4 text-emerald-400" />Verified skills</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.verifiedSkills?.length ? summary.verifiedSkills.map((skill) => <Badge key={skill} variant="emerald" size="sm">{skill}</Badge>) : <span className="text-xs text-slate-500">No verified skills listed.</span>}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <h3 className="text-sm font-bold text-white">GitHub evidence</h3>
          {github ? <p className="mt-3 text-xs leading-5 text-slate-400">{github.repositoryCount ?? 0} repositories, {github.commitCount ?? 0} commits, {github.recentCommitCount ?? 0} recent commits.</p> : <p className="mt-3 text-xs text-slate-500">No public GitHub analytics available.</p>}
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <h3 className="text-sm font-bold text-white">Evaluation freshness</h3>
          <p className="mt-3 text-xs text-slate-400">{summary.portfolioScore?.isStale || summary.industryReadiness?.isStale ? 'Some evidence may be stale.' : 'Evidence is current when an evaluation timestamp is available.'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[['Strengths', strengths, 'emerald'], ['Gaps', gaps, 'rose'], ['Recommendations', recommendations, 'amber']].map(([label, items, color]) => (
          <div key={label} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <h3 className={`flex items-center gap-2 text-sm font-bold ${color === 'rose' ? 'text-rose-300' : color === 'amber' ? 'text-amber-300' : 'text-emerald-300'}`}><Lightbulb className="h-4 w-4" />{label}</h3>
            {items.length ? <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-400">{items.slice(0, 5).map((item, index) => <li key={`${label}-${index}`} className="flex gap-2"><span className={color === 'rose' ? 'text-rose-400' : color === 'amber' ? 'text-amber-400' : 'text-emerald-400'}>•</span><span>{typeof item === 'string' ? item : item?.text || item?.reason || JSON.stringify(item)}</span></li>)}</ul> : <p className="mt-3 text-xs text-slate-500">No {label.toLowerCase()} reported.</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CandidateAISummary;
