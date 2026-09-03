import React, { useEffect, useState } from 'react';
import { ArrowLeft, Award, BriefcaseBusiness, CalendarDays, Code2 as Github, ExternalLink, Plus, ShieldCheck } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import CandidateAISummary from '@/components/recruiter/CandidateAISummary';
import recruiterService from '@/services/recruiterService';
import { formatDate, getErrorMessage } from '@/utils/formatters';

const unwrap = (response) => response?.data ?? response;

const CandidateDetails = () => {
  const { studentId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState('');
  const [summaryError, setSummaryError] = useState('');
  const [notice, setNotice] = useState('');
  const [shortlistLoading, setShortlistLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'ai' ? 'ai' : 'profile');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setSummaryLoading(true);
      setError('');
      setSummaryError('');
      const [detailsResult, summaryResult] = await Promise.allSettled([
        recruiterService.getCandidateDetails(studentId),
        recruiterService.getCandidateAISummary(studentId),
      ]);
      if (cancelled) return;
      if (detailsResult.status === 'fulfilled') setCandidate(unwrap(detailsResult.value));
      else setError(getErrorMessage(detailsResult.reason));
      if (summaryResult.status === 'fulfilled') setSummary(unwrap(summaryResult.value));
      else setSummaryError(getErrorMessage(summaryResult.reason));
      setLoading(false);
      setSummaryLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [studentId]);

  const handleShortlist = async () => {
    try {
      setShortlistLoading(true);
      await recruiterService.addShortlist(studentId);
      setNotice('Candidate added to your shortlist.');
    } catch (requestError) {
      setNotice(getErrorMessage(requestError));
    } finally {
      setShortlistLoading(false);
    }
  };

  if (loading) {
    return <DashboardLayout><div className="flex min-h-96 items-center justify-center text-sm text-slate-400"><Spinner className="mr-3" /> Loading candidate profile…</div></DashboardLayout>;
  }

  if (error || !candidate) {
    return <DashboardLayout><div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center text-sm text-rose-300">{error || 'Candidate not found.'}<div className="mt-4"><Button type="button" variant="secondary" onClick={() => navigate('/recruiter/candidates')}>Back to candidates</Button></div></div></DashboardLayout>;
  }

  const projects = candidate.projects || [];
  const certificates = candidate.certificates || [];
  const portfolios = candidate.verifiedPortfolios || [];

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="sm" leftIcon={ArrowLeft} onClick={() => navigate('/recruiter/candidates')}>All candidates</Button>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="success" loading={shortlistLoading} leftIcon={Plus} onClick={handleShortlist}>Shortlist</Button>
          <Button type="button" variant="primary" leftIcon={CalendarDays} onClick={() => navigate(`/recruiter/interviews?candidateId=${studentId}`)}>Schedule interview</Button>
        </div>
      </div>

      {notice && <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-300">{notice}</div>}

      <section className="mb-6 rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <Avatar name={candidate.name} src={candidate.profilePhoto} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold text-white">{candidate.name}</h1>
              {candidate.verificationSummary?.isPortfolioVerified && <Badge variant="emerald" dot>Public verified portfolio</Badge>}
            </div>
            <p className="mt-1 text-sm text-slate-300">{candidate.headline || `${candidate.degree || 'Student'} · ${candidate.branch || 'Branch not provided'}`}</p>
            <p className="mt-2 text-sm text-slate-400">{candidate.college} {candidate.graduationYear ? `· Class of ${candidate.graduationYear}` : ''}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(candidate.skills || []).map((skill) => <Badge key={skill} variant="slate" size="sm">{skill}</Badge>)}
            </div>
          </div>
          <div className="grid min-w-48 grid-cols-2 gap-2 text-center">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><p className="text-[11px] text-slate-500">Verified projects</p><p className="mt-1 text-xl font-bold text-emerald-300">{candidate.verificationSummary?.projects?.verified ?? 0}</p></div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><p className="text-[11px] text-slate-500">GitHub</p><p className="mt-1 text-sm font-bold text-white">{candidate.github?.isConnected ? 'Connected' : 'Unavailable'}</p></div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-800 pt-4 text-xs text-slate-400">
          {candidate.githubUrl && <a className="inline-flex items-center gap-1.5 hover:text-white" href={candidate.githubUrl} target="_blank" rel="noreferrer"><Github className="h-4 w-4" /> GitHub <ExternalLink className="h-3 w-3" /></a>}
          {candidate.linkedinUrl && <a className="inline-flex items-center gap-1.5 hover:text-white" href={candidate.linkedinUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> LinkedIn</a>}
        </div>
      </section>

      <div className="mb-5 flex gap-2 border-b border-slate-800">
        <button type="button" className={`border-b-2 px-3 py-3 text-sm font-semibold ${activeTab === 'profile' ? 'border-emerald-400 text-emerald-300' : 'border-transparent text-slate-500'}`} onClick={() => setActiveTab('profile')}>Verified profile</button>
        <button type="button" className={`border-b-2 px-3 py-3 text-sm font-semibold ${activeTab === 'ai' ? 'border-emerald-400 text-emerald-300' : 'border-transparent text-slate-500'}`} onClick={() => setActiveTab('ai')}>AI summary</button>
      </div>

      {activeTab === 'ai' ? (
        <SectionCard title="AI evidence" subtitle="Backend evaluation results from verified, public portfolio evidence.">
          <CandidateAISummary summary={summary} loading={summaryLoading} error={summaryError} />
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            <SectionCard title="About candidate">
              <p className="whitespace-pre-line text-sm leading-7 text-slate-300">{candidate.bio || 'No public bio has been provided.'}</p>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div><p className="text-xs text-slate-500">Degree</p><p className="mt-1 text-sm text-white">{candidate.degree || 'Not provided'}</p></div>
                <div><p className="text-xs text-slate-500">Graduation year</p><p className="mt-1 text-sm text-white">{candidate.graduationYear || 'Not provided'}</p></div>
                <div><p className="text-xs text-slate-500">CGPA</p><p className="mt-1 text-sm text-white">{candidate.cgpa ?? 'Not provided'}</p></div>
              </div>
            </SectionCard>

            <SectionCard title="Verified projects" subtitle="Only projects marked Verified by the platform are shown here.">
              {projects.length ? <div className="space-y-3">{projects.map((project) => <div key={project.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-bold text-white">{project.title}</h3><Badge variant="emerald" size="sm" dot>Verified</Badge></div><p className="mt-2 text-sm leading-6 text-slate-400">{project.shortDescription || project.detailedDescription || 'No public project description.'}</p><div className="mt-3 flex flex-wrap gap-2">{(project.technologies || []).map((technology) => <Badge key={technology} variant="slate" size="sm">{technology}</Badge>)}</div><div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">{project.githubRepository && <a className="hover:text-white" href={project.githubRepository} target="_blank" rel="noreferrer">GitHub <ExternalLink className="inline h-3 w-3" /></a>}{project.liveDeployment && <a className="hover:text-white" href={project.liveDeployment} target="_blank" rel="noreferrer">Live demo <ExternalLink className="inline h-3 w-3" /></a>}</div></div>)}</div> : <p className="text-sm text-slate-500">No verified projects are available.</p>}
            </SectionCard>

            <SectionCard title="Verified certificates">
              {certificates.length ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{certificates.map((certificate) => <div key={certificate.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"><div className="flex items-start gap-3"><Award className="mt-0.5 h-5 w-5 text-amber-300" /><div><h3 className="font-bold text-white">{certificate.title}</h3><p className="mt-1 text-xs text-slate-400">{certificate.issuer || 'Issuer not provided'} · {formatDate(certificate.issueDate)}</p>{certificate.skills?.length ? <div className="mt-3 flex flex-wrap gap-1.5">{certificate.skills.map((skill) => <Badge key={skill} variant="slate" size="sm">{skill}</Badge>)}</div> : null}</div></div></div>)}</div> : <p className="text-sm text-slate-500">No verified certificates are available.</p>}
            </SectionCard>

            <SectionCard title="Experience">
              <div className="flex items-center gap-3 text-sm text-slate-500"><BriefcaseBusiness className="h-5 w-5" />Experience details are not part of the current public candidate API.</div>
            </SectionCard>
          </div>

          <div className="space-y-5">
            <SectionCard title="Verification summary">
              <div className="space-y-3 text-sm">{[['Profile', candidate.verificationSummary?.isProfileVerified], ['Portfolio', candidate.verificationSummary?.isPortfolioVerified], ['GitHub', candidate.verificationSummary?.isGithubVerified]].map(([label, verified]) => <div key={label} className="flex items-center justify-between"><span className="text-slate-400">{label}</span><Badge variant={verified ? 'emerald' : 'slate'} size="sm" dot>{verified ? 'Verified' : 'Unavailable'}</Badge></div>)}</div>
            </SectionCard>
            <SectionCard title="Public verified portfolios">
              {portfolios.length ? <div className="space-y-3">{portfolios.map((portfolio) => <div key={portfolio.id} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3"><div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-300" /><div><p className="text-sm font-semibold text-white">{portfolio.projectTitle}</p><p className="mt-1 text-xs text-slate-400">Certificate {portfolio.certificateId} · issued {formatDate(portfolio.issuedAt)}</p></div></div></div>)}</div> : <p className="text-sm text-slate-500">This candidate has not made a verified portfolio public.</p>}
            </SectionCard>
            <SectionCard title="GitHub summary">
              {candidate.github?.isConnected ? <div className="space-y-2 text-sm text-slate-300"><p className="font-semibold text-white">@{candidate.github.username}</p><p>{candidate.github.publicRepos} public repositories</p><p>{candidate.github.followers} followers · {candidate.github.following} following</p></div> : <p className="text-sm text-slate-500">No connected GitHub account is available.</p>}
            </SectionCard>
            <SectionCard title="Resume">
              {candidate.resume?.isAvailable && candidate.resume.fileUrl ? <a className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 hover:text-emerald-200" href={candidate.resume.fileUrl} target="_blank" rel="noreferrer">Download public resume <ExternalLink className="h-4 w-4" /></a> : <p className="text-sm text-slate-500">Resume download is restricted until the candidate permits visibility.</p>}
            </SectionCard>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default CandidateDetails;
