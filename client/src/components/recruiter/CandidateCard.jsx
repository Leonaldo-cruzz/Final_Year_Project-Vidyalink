import React from 'react';
import { ArrowUpRight, Bookmark, BrainCircuit, Code2 as Github, ShieldCheck } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

const CandidateCard = ({ candidate, onView, onSummary, onShortlist, shortlistLoading = false }) => {
  const scoreAvailable = candidate.portfolioScore !== null && candidate.portfolioScore !== undefined && candidate.portfolioScore !== '' && Number.isFinite(Number(candidate.portfolioScore));
  const skills = Array.isArray(candidate.skills) ? candidate.skills : [];

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/30">
      <div className="flex items-start gap-3">
        <Avatar name={candidate.name} src={candidate.profilePhoto} size="lg" />
        <div className="min-w-0 flex-1">
          <button type="button" className="truncate text-left text-base font-bold text-white hover:text-emerald-300" onClick={onView}>
            {candidate.name || 'Unnamed candidate'}
          </button>
          <p className="mt-1 truncate text-xs text-slate-400">{candidate.college || 'College not provided'}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{candidate.branch || 'Branch not provided'}{candidate.graduationYear ? ` · Class of ${candidate.graduationYear}` : ''}</p>
        </div>
        <Badge variant={candidate.portfolioVerified ? 'emerald' : 'slate'} size="sm" dot>
          {candidate.portfolioVerified ? 'Verified' : 'Private'}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {skills.slice(0, 5).map((skill) => <Badge key={skill} variant="slate" size="sm">{skill}</Badge>)}
        {skills.length > 5 && <Badge variant="slate" size="sm">+{skills.length - 5}</Badge>}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <p className="text-slate-500">Portfolio score</p>
          <p className="mt-1 text-sm font-bold text-emerald-300">{scoreAvailable ? `${candidate.portfolioScore}%` : 'Not evaluated'}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <p className="text-slate-500">Verified projects</p>
          <p className="mt-1 text-sm font-bold text-white">{candidate.verifiedProjectCount ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <p className="text-slate-500">Industry readiness</p>
          <p className="mt-1 text-sm font-bold text-amber-300">{candidate.industryReadinessScore !== null && candidate.industryReadinessScore !== undefined && candidate.industryReadinessScore !== '' && Number.isFinite(Number(candidate.industryReadinessScore)) ? `${candidate.industryReadinessScore}%` : 'Not evaluated'}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />{candidate.portfolioVerified ? 'Public portfolio' : 'Portfolio private'}</span>
        <span className="inline-flex items-center gap-1"><Github className={candidate.githubConnected ? 'h-3.5 w-3.5 text-slate-200' : 'h-3.5 w-3.5 text-slate-600'} />{candidate.githubConnected ? 'GitHub connected' : 'GitHub unavailable'}</span>
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <Button type="button" size="sm" variant="secondary" leftIcon={ArrowUpRight} onClick={onView}>View portfolio</Button>
        <Button type="button" size="sm" variant="ghost" leftIcon={BrainCircuit} onClick={onSummary}>AI summary</Button>
        <Button type="button" size="sm" variant="success" loading={shortlistLoading} leftIcon={Bookmark} onClick={onShortlist}>Shortlist</Button>
      </div>
    </article>
  );
};

export default CandidateCard;
