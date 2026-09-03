import React from 'react';
import { ArrowUpRight, Bookmark, X } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

const hasScore = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
const formatScore = (value) => (hasScore(value) ? `${Number(value)}%` : 'N/A');
const list = (value) => (Array.isArray(value) ? value : []);

const CandidateComparisonCard = ({ candidate, onView, onRemove, onShortlist, shortlistLoading = false }) => {
  const gaps = [
    ...list(candidate.skillGaps?.missingRequiredSkills),
    ...list(candidate.skillGaps?.missingPreferredSkills),
    ...list(candidate.skillGaps?.weakEvidenceSkills).map((item) => item?.name || item?.reason || item),
  ].filter(Boolean);
  const education = list(candidate.education);
  const experience = list(candidate.experience);
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div><h2 className="text-lg font-bold text-white">{candidate.name}</h2><p className="mt-1 text-xs text-slate-500">Compared from public profile data</p></div>
        <button type="button" aria-label={`Remove ${candidate.name}`} className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-white" onClick={() => onRemove(candidate.studentId)}><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {[['Portfolio', candidate.portfolioScore, 'text-emerald-300'], ['ATS', candidate.atsScore, 'text-blue-300'], ['GitHub', candidate.githubEvidence?.score ?? candidate.githubEvidence, 'text-purple-300'], ['Readiness', candidate.industryReadiness?.score ?? candidate.industryReadiness, 'text-amber-300']].map(([label, value, color]) => <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><p className="text-[11px] text-slate-500">{label}</p><p className={`mt-1 font-bold ${color}`}>{formatScore(value)}</p></div>)}
      </div>
      <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Verified skills</p><div className="mt-2 flex flex-wrap gap-1.5">{list(candidate.verifiedSkills).length ? list(candidate.verifiedSkills).slice(0, 10).map((skill) => <Badge key={skill} variant="emerald" size="sm">{skill}</Badge>) : <span className="text-xs text-slate-500">None listed</span>}</div></div>
      <div className="mt-4 grid grid-cols-1 gap-3 text-xs text-slate-400">
        <div><p className="font-semibold text-slate-300">Skill gaps</p><p className="mt-1">{gaps.length ? [...new Set(gaps)].slice(0, 5).join(', ') : 'None listed'}</p></div>
        <div><p className="font-semibold text-slate-300">Verified projects</p><p className="mt-1">{list(candidate.verifiedProjects).length ? `${list(candidate.verifiedProjects).length} · ${list(candidate.verifiedProjects).slice(0, 2).join(', ')}` : 'None listed'}</p></div>
        <div><p className="font-semibold text-slate-300">Experience</p><p className="mt-1">{experience.length ? experience.slice(0, 2).map((item) => `${item.position || 'Experience'}${item.company ? ` · ${item.company}` : ''}`).join('; ') : 'None listed'}</p></div>
        <div><p className="font-semibold text-slate-300">Education</p><p className="mt-1">{education.length ? education.slice(0, 2).map((item) => `${item.degree || item.fieldOfStudy || 'Education'}${item.institution ? ` · ${item.institution}` : ''}`).join('; ') : 'None listed'}</p></div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" leftIcon={ArrowUpRight} onClick={() => onView(candidate)}>View profile</Button>
        <Button type="button" size="sm" variant="success" loading={shortlistLoading} leftIcon={Bookmark} onClick={() => onShortlist(candidate)}>Shortlist</Button>
      </div>
    </article>
  );
};

export default CandidateComparisonCard;
