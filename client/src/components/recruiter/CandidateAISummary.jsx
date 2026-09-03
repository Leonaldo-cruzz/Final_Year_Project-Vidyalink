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

const hasScore = (value) => value !== null
  && value !== undefined
  && value !== ''
  && Number.isFinite(Number(value));

const displayItem = (item) => {
  if (typeof item === 'string') return item;
  return item?.text || item?.title || item?.reason || item?.recommendation || null;
};

const Score = ({ label, value, icon: Icon, color = 'emerald' }) => {
  const available = hasScore(value);
  const colors = SCORE_COLORS[color] || SCORE_COLORS.emerald;
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500">{label}</span>
        <Icon className={`h-4 w-4 ${colors.icon}`} />
      </div>
      <p className={`mt-2 text-2xl font-extrabold ${available ? colors.value : 'text-slate-500'}`}>
        {available ? `${Number(value)}%` : 'N/A'}
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
    return <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">Not evaluated yet. No public AI evaluation is available for this candidate.</div>;
  }

  const portfolioScore = summary.portfolioScore?.score ?? summary.portfolioScore;
  const atsScore = summary.atsScore?.score ?? summary.atsScore;
  const industryReadiness = summary.industryReadiness?.score ?? summary.industryReadiness;
  const githubEvidence = summary.githubEvidence?.score
    ?? summary.githubEvidenceScore
    ?? summary.industryReadiness?.breakdown?.githubEvidence?.score;
  const github = summary.github || summary.githubAnalytics || summary.githubAnalyticsSummary;
  const skillGaps = summary.skillGaps || {};
  const strengths = summary.strengths || summary.topStrengths || summary.industryReadiness?.strengths || [];
  const recommendations = summary.recommendations || summary.industryReadiness?.topRecommendations || [];
  const gaps = [
    ...(skillGaps.missingRequiredSkills || []),
    ...(skillGaps.missingPreferredSkills || []),
    ...(skillGaps.weakEvidenceSkills || []),
    ...(summary.topGaps || summary.industryReadiness?.gaps || []),
  ];
  const hasEvaluation = Boolean(summary.metadata?.evaluatedAt)
    || [portfolioScore, atsScore, industryReadiness, githubEvidence].some(hasScore)
    || Boolean(strengths.length || recommendations.length || gaps.length);
  if (!hasEvaluation) {
    return <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">Not evaluated yet. The candidate has a public verified portfolio, but no persisted AI evaluation is available.</div>;
  }

  const evaluationRecords = [summary.portfolioScore, summary.atsScore, summary.industryReadiness, summary.github]
    .filter(Boolean);
  const isStale = Boolean(summary.metadata?.isStale || evaluationRecords.some((record) => record.isStale));
  const evaluatedAt = summary.metadata?.evaluatedAt
    || evaluationRecords.map((record) => record.evaluatedAt).filter(Boolean).sort().at(-1);
  const scoringVersions = summary.metadata?.scoringVersions?.length
    ? summary.metadata.scoringVersions
    : [...new Set(evaluationRecords.map((record) => record.scoringVersion).filter(Boolean))];
  const explanationEntries = Object.entries(summary.industryReadiness?.breakdown || {})
    .map(([name, value]) => ({ name, explanation: value?.explanation }))
    .filter((entry) => entry.explanation);
  const githubHasActivity = github && [github.repositoryCount, github.commitCount, github.recentCommitCount].some((value) => value !== null && value !== undefined);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">Persisted evaluator results and verified public evidence only.</p>
        {isStale ? <Badge variant="amber" size="sm" dot>Stale evaluation</Badge> : <Badge variant="emerald" size="sm" dot>Read-only signal</Badge>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Score label="Portfolio score" value={portfolioScore} icon={ShieldCheck} />
        <Score label="ATS score" value={atsScore} icon={Target} color="blue" />
        <Score label="GitHub evidence" value={githubEvidence} icon={Github} color="purple" />
        <Score label="Industry readiness" value={industryReadiness} icon={BrainCircuit} color="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white"><ShieldCheck className="h-4 w-4 text-emerald-400" />Verified skills</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.verifiedSkills?.length ? summary.verifiedSkills.map((skill) => <Badge key={skill} variant="emerald" size="sm">{skill}</Badge>) : <span className="text-xs text-slate-500">No verified skills listed.</span>}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <h3 className="text-sm font-bold text-white">GitHub evidence detail</h3>
          {githubHasActivity ? <p className="mt-3 text-xs leading-5 text-slate-400">{github.repositoryCount ?? 'N/A'} repositories, {github.commitCount ?? 'N/A'} commits, and {github.recentCommitCount ?? 'N/A'} recent commits were stored by the GitHub evaluator.</p> : <p className="mt-3 text-xs text-slate-500">No public GitHub analytics available.</p>}
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <h3 className="text-sm font-bold text-white">Evaluation metadata</h3>
          <p className="mt-3 text-xs leading-5 text-slate-400">{evaluatedAt ? `Latest evaluation: ${new Date(evaluatedAt).toLocaleDateString()}.` : 'Evaluation date is not available.'}</p>
          <p className="mt-2 text-xs text-slate-500">Scoring version: {scoringVersions.length ? scoringVersions.join(', ') : 'Not available'}</p>
          {isStale && <p className="mt-2 text-xs text-amber-300">Source evidence changed after this evaluation. Treat it as stale until the existing engine refreshes it.</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[['Strengths', strengths, 'emerald'], ['Skill gaps', gaps, 'rose'], ['Recommendations', recommendations, 'amber']].map(([label, items, color]) => (
          <div key={label} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <h3 className={`flex items-center gap-2 text-sm font-bold ${color === 'rose' ? 'text-rose-300' : color === 'amber' ? 'text-amber-300' : 'text-emerald-300'}`}><Lightbulb className="h-4 w-4" />{label}</h3>
            {items.length ? <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-400">{items.slice(0, 8).map((item, index) => <li key={`${label}-${index}`} className="flex gap-2"><span className={color === 'rose' ? 'text-rose-400' : color === 'amber' ? 'text-amber-400' : 'text-emerald-400'}>•</span><span>{displayItem(item) || 'Stored evaluator insight'}</span></li>)}</ul> : <p className="mt-3 text-xs text-slate-500">No {label.toLowerCase()} reported.</p>}
          </div>
        ))}
      </div>

      {explanationEntries.length > 0 && <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <h3 className="text-sm font-bold text-white">How the readiness signal is explained</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {explanationEntries.slice(0, 6).map((entry) => <div key={entry.name}><p className="text-xs font-semibold capitalize text-slate-300">{entry.name.replace(/([A-Z])/g, ' $1')}</p><p className="mt-1 text-xs leading-5 text-slate-500">{entry.explanation}</p></div>)}
        </div>
      </div>}

      <p className="text-[11px] leading-5 text-slate-500">AI outputs are evidence signals for recruiter review, not a hiring decision or automatic recommendation.</p>
    </div>
  );
};

export default CandidateAISummary;
