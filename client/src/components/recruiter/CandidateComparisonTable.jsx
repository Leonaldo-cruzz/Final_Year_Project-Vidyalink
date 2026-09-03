import React from 'react';
import { ArrowUpRight, Bookmark, Code2 as Github, ShieldCheck, X } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import AIComparisonRow from './AIComparisonRow';

const hasScore = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
const formatScore = (value) => (hasScore(value) ? `${Number(value)}%` : 'N/A');
const list = (value) => (Array.isArray(value) ? value : []);
const displayItems = (value) => list(value).map((item) => (typeof item === 'string' ? item : item?.name || item?.reason || item?.text)).filter(Boolean);

const CandidateComparisonTable = ({ candidates, onView, onRemove, onShortlist, shortlistLoadingId }) => {
  const renderSkills = (candidate) => {
    const skills = list(candidate.verifiedSkills);
    return skills.length ? <div className="flex flex-wrap gap-1.5">{skills.slice(0, 10).map((skill) => <Badge key={skill} variant="emerald" size="sm">{skill}</Badge>)}</div> : <span className="text-slate-500">None listed</span>;
  };
  const renderGaps = (candidate) => {
    const gaps = [
      ...list(candidate.skillGaps?.missingRequiredSkills),
      ...list(candidate.skillGaps?.missingPreferredSkills),
      ...displayItems(candidate.skillGaps?.weakEvidenceSkills),
    ];
    return gaps.length ? <div className="space-y-1 text-xs text-rose-200">{[...new Set(gaps)].slice(0, 8).map((gap) => <p key={gap}>{gap}</p>)}</div> : <span className="text-slate-500">None listed</span>;
  };
  const renderProjects = (candidate) => {
    const projects = list(candidate.verifiedProjects);
    return projects.length ? <div><p className="font-semibold text-emerald-300">{projects.length} verified</p><p className="mt-1 text-xs text-slate-500">{projects.slice(0, 3).join(', ')}</p></div> : <span className="text-slate-500">None listed</span>;
  };
  const renderExperience = (candidate) => {
    const experience = list(candidate.experience);
    return experience.length ? <div className="space-y-1">{experience.slice(0, 3).map((item, index) => <p key={`${item.company || 'experience'}-${index}`}><span className="font-semibold text-white">{item.position || 'Experience'}</span>{item.company ? ` · ${item.company}` : ''}</p>)}</div> : <span className="text-slate-500">None listed</span>;
  };
  const renderEducation = (candidate) => {
    const education = list(candidate.education);
    return education.length ? <div className="space-y-1">{education.slice(0, 3).map((item, index) => <p key={`${item.institution || 'education'}-${index}`}>{item.degree || item.fieldOfStudy || 'Education'}{item.institution ? ` · ${item.institution}` : ''}</p>)}</div> : <span className="text-slate-500">None listed</span>;
  };

  return (
    <div className="hidden overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40 lg:block">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-slate-900/80">
            <th scope="col" className="min-w-44 px-4 py-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Signal</th>
            {candidates.map((candidate) => <th scope="col" key={candidate.studentId} className="min-w-52 px-4 py-4 align-top">
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-bold text-white">{candidate.name}</p><p className="mt-1 text-[11px] text-slate-500">Candidate comparison</p></div>
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="xs" variant="secondary" leftIcon={ArrowUpRight} onClick={() => onView(candidate)}>Profile</Button>
                <Button type="button" size="xs" variant="success" loading={shortlistLoadingId === candidate.studentId} leftIcon={Bookmark} onClick={() => onShortlist(candidate)}>Shortlist</Button>
                <Button type="button" size="xs" variant="ghost" leftIcon={X} onClick={() => onRemove(candidate.studentId)}>Remove</Button>
              </div>
            </th>)}
          </tr>
        </thead>
        <tbody>
          <AIComparisonRow label="Portfolio score" candidates={candidates} getValue={(candidate) => <span className="font-bold text-emerald-300">{formatScore(candidate.portfolioScore)}</span>} />
          <AIComparisonRow label="ATS score" candidates={candidates} getValue={(candidate) => <span className="font-bold text-blue-300">{formatScore(candidate.atsScore)}</span>} />
          <AIComparisonRow label="GitHub evidence" candidates={candidates} getValue={(candidate) => <span className="inline-flex items-center gap-2 font-bold text-purple-300"><Github className="h-4 w-4" />{formatScore(candidate.githubEvidence?.score ?? candidate.githubEvidence)}</span>} />
          <AIComparisonRow label="Industry readiness" candidates={candidates} getValue={(candidate) => <span className="font-bold text-amber-300">{formatScore(candidate.industryReadiness?.score ?? candidate.industryReadiness)}</span>} />
          <AIComparisonRow label="Verified skills" candidates={candidates} getValue={renderSkills} />
          <AIComparisonRow label="Skill gaps" candidates={candidates} getValue={renderGaps} />
          <AIComparisonRow label="Verified projects" candidates={candidates} getValue={renderProjects} />
          <AIComparisonRow label="Experience" candidates={candidates} getValue={renderExperience} />
          <AIComparisonRow label="Education" candidates={candidates} getValue={renderEducation} />
        </tbody>
      </table>
    </div>
  );
};

export default CandidateComparisonTable;
