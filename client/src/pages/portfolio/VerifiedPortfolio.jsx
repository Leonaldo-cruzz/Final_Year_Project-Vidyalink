import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Award, ShieldCheck, CheckCircle2, Share2, Calendar, User,
  Building, Loader2, Check, Sparkles
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import MainLayout from '@/layouts/MainLayout';
import Button from '@/components/ui/Button';
import { SectionCard } from '@/components/ui/Card';
import {
  getMyPortfolios,
  verifyCertificate,
} from '@/services/portfolioService';
import { getVerificationHistory } from '@/services/verificationService';
import { getLatestAIResults, runAIEvaluation } from '@/services/aiService';
import { getErrorMessage } from '@/utils/formatters';
import { ROUTES } from '@/constants';

const VerifiedPortfolio = () => {
  const { certificateId } = useParams();
  const navigate = useNavigate();

  const [portfolios, setPortfolios] = useState([]);
  const [singlePortfolio, setSinglePortfolio] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('NOT_SUBMITTED');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [aiResults, setAiResults] = useState({});
  const [aiLoading, setAiLoading] = useState({});

  useEffect(() => {
    const fetchPortfolioData = async () => {
      try {
        setLoading(true);
        if (certificateId) {
          const res = await verifyCertificate(certificateId);
          setSinglePortfolio(res.data);
        } else {
          const res = await getMyPortfolios();
          const nextPortfolios = res.data || [];
          setPortfolios(nextPortfolios);
          if (nextPortfolios.length === 0) {
            try {
              const historyRes = await getVerificationHistory({ targetType: 'PROJECT' });
              const historyList = historyRes?.data || [];
              const latest = historyList[0];
              if (latest?.status) {
                setVerificationStatus(latest.status);
              }
            } catch {
              // Ignore history error
            }
          } else {
            const resultEntries = await Promise.all(nextPortfolios.map(async (portfolio) => {
              try {
                const response = await getLatestAIResults(portfolio._id);
                return [portfolio._id, response.data?.data ?? response.data];
              } catch {
                return [portfolio._id, { status: 'unavailable' }];
              }
            }));
            setAiResults(Object.fromEntries(resultEntries));
          }
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolioData();
  }, [certificateId]);

  const handleShare = (certId) => {
    const url = `${window.location.origin}/portfolio/verify/${certId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(certId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleEvaluate = async (portfolioId) => {
    try {
      setAiLoading((previous) => ({ ...previous, [portfolioId]: true }));
      const response = await runAIEvaluation({ portfolioId, force: true });
      setAiResults((previous) => ({
        ...previous,
        [portfolioId]: response.data?.data ?? response.data,
      }));
    } catch (err) {
      setAiResults((previous) => ({
        ...previous,
        [portfolioId]: { status: 'FAILED', reason: getErrorMessage(err) },
      }));
    } finally {
      setAiLoading((previous) => ({ ...previous, [portfolioId]: false }));
    }
  };

  const renderPortfolioCard = (p, allowEvaluation = false) => {
    const aiResult = aiResults[p._id] || {};
    const evaluation = aiResult.evaluation;
    const readiness = aiResult.readiness;
    const status = aiResult.status;

    return (
    <div
      key={p._id || p.certificateId}
      className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-linear-to-b from-slate-900/95 via-slate-900/80 to-slate-950 p-5 sm:p-7 md:p-9 shadow-xl space-y-6"
    >
      {/* Decorative Institutional Crest Watermark */}
      <div className="absolute right-4 top-4 pointer-events-none opacity-5 select-none">
        <ShieldCheck className="w-64 h-64 text-white" />
      </div>

      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-white">
                Academic Credential Record
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" /> Faculty Verified
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Registry Identifier: <strong className="text-orange-300">{p.certificateId}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            size="sm"
            variant="secondary"
            leftIcon={copiedId === p.certificateId ? Check : Share2}
            onClick={() => handleShare(p.certificateId)}
          >
            {copiedId === p.certificateId ? 'Link Copied!' : 'Share Credential'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.open(`/portfolio/verify/${p.certificateId}`, '_blank')}
          >
            Public View
          </Button>
        </div>
      </div>

      {/* Project & Student Context */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3.5">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">
              Verified Project Achievement
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
              {p.projectTitle}
            </h3>
          </div>

          <p className="text-xs leading-relaxed text-slate-300">
            Formally certified project demonstrated and audited according to university academic standards. Validated through direct faculty review and recorded in the institutional registry.
          </p>

          {/* Verified Skills */}
          {p.skillsVerified?.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Assessed Technical Competencies
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {p.skillsVerified.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-emerald-500/25 text-xs font-semibold text-emerald-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Institutional Verification Metadata */}
        <div className="p-4 sm:p-5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3 shadow-inner">
          <div className="border-b border-slate-800/80 pb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-300">
              Credential Signatories
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-slate-200">
            <User className="w-4 h-4 text-orange-300 shrink-0" />
            <span>Candidate: <strong>{p.student?.fullName || ''}</strong></span>
          </div>

          {p.student?.college && (
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <Building className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Institution: <strong>{p.student.college}</strong></span>
            </div>
          )}

          {p.verifiedBy?.fullName && (
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <Award className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Certifying Authority:{' '}
                <strong className="text-white">
                  {p.verifiedBy.fullName}
                </strong>{' '}
                ({p.verifiedBy.role === 'faculty' ? 'Faculty' : p.verifiedBy.role})
              </span>
            </div>
          )}

          <div className="flex items-center gap-2.5 text-xs text-slate-400">
            <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Date of Conformance: {new Date(p.issuedAt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Verified Project Evidence Breakdown */}
      {p.milestonesSummary?.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Evaluated Project Evidence & Outcomes
            </h4>
            <span className="text-[11px] font-semibold text-emerald-400">
              {p.milestonesSummary.length}/{p.milestonesSummary.length} Components Verified & Approved
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {p.milestonesSummary.map((m, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold truncate">{m.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-purple-400/20 bg-purple-500/5 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-300" />
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-200">AI Evidence Analysis</h4>
          </div>
          {allowEvaluation && (!evaluation || ['NOT_EVALUATED', 'STALE', 'FAILED'].includes(status)) && (
            <Button
              size="sm"
              variant="secondary"
              loading={Boolean(aiLoading[p._id])}
              onClick={() => handleEvaluate(p._id)}
            >
              Evaluate verified portfolio
            </Button>
          )}
        </div>

        {evaluation ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <span className="text-3xl font-black text-white">{evaluation.overallScore}</span>
              <span className="text-sm font-bold text-purple-200">{evaluation.category}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(evaluation.componentScores || {}).map(([key, value]) => (
                <div key={key} className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">{key.replaceAll('_', ' ')}</p>
                  <p className="text-sm font-bold text-slate-100">{value}/100</p>
                </div>
              ))}
            </div>
            {evaluation.evidence && (
              <div className="text-xs text-slate-300 space-y-1">
                <p className="font-semibold text-slate-200">Evidence used</p>
                {Object.entries(evaluation.evidence).map(([key, values]) => (
                  <p key={key}><span className="text-slate-500">{key.replaceAll('_', ' ')}:</span> {(values || []).join('; ') || 'No supporting evidence supplied.'}</p>
                ))}
              </div>
            )}
            {evaluation.improvements?.length > 0 && (
              <div className="text-xs text-slate-300">
                <p className="font-semibold text-slate-200 mb-1">Improvements</p>
                <ul className="list-disc pl-5 space-y-1">{evaluation.improvements.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            )}
            {evaluation.strengths?.length > 0 && (
              <div className="text-xs text-slate-300">
                <p className="font-semibold text-slate-200 mb-1">Strengths</p>
                <ul className="list-disc pl-5 space-y-1">{evaluation.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            )}
            {readiness && (
              <p className="text-xs text-slate-300">Industry readiness: <strong className="text-white">{readiness.readiness_score}/100</strong> · {readiness.category}</p>
            )}
          </div>
        ) : ['INSUFFICIENT_EVIDENCE', 'insufficient_evidence'].includes(status) ? (
          <p className="text-xs text-amber-200">Insufficient verified evidence for evaluation.</p>
        ) : status === 'FAILED' || status === 'unavailable' ? (
          <p className="text-xs text-red-300">{aiResult.reason || 'AI service unavailable. Please try again.'}</p>
        ) : status === 'STALE' ? (
          <p className="text-xs text-amber-200">Portfolio changed since last evaluation. Re-evaluate to refresh the stored result.</p>
        ) : (
          <p className="text-xs text-slate-400">Not evaluated yet. Only this faculty-verified portfolio record will be sent for analysis.</p>
        )}
      </div>

      {/* Record Security Hash */}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between text-xs text-slate-400 gap-2 font-mono">
        <div className="flex items-center gap-2 min-w-0 max-w-full">
          <span className="text-slate-500 shrink-0">Record Hash:</span>
          <span className="text-slate-300 truncate break-all selection:bg-orange-300/30">
            {p.verificationHash}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-emerald-400 font-bold">Verification Record Valid</span>
        </div>
      </div>
    </div>
    );
  };

  const content = (
    <div className={`mx-auto max-w-4xl space-y-6 ${certificateId ? 'px-4 py-12 sm:px-6 lg:px-8' : ''}`}>
      <div>
        <h1 className="page-title text-white">Verified Academic Portfolio</h1>
        <p className="text-sm text-slate-400 mt-1">
          Faculty-verified student competencies, project evidence, and certified academic achievements.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 text-orange-300 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Verifying credential record integrity...</p>
        </div>
      ) : error ? (
        <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          <p className="font-semibold text-red-200">Credential Verification Error</p>
          <p className="mt-1 text-red-300/80">{error}</p>
        </div>
      ) : certificateId ? (
        singlePortfolio ? (
          renderPortfolioCard(singlePortfolio)
        ) : (
          <SectionCard className="text-center py-12">
            <p className="text-sm text-slate-400">Certificate record not found.</p>
          </SectionCard>
        )
      ) : portfolios.length === 0 ? (
        <SectionCard className="text-center py-16">
          <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">
            {verificationStatus === 'PENDING'
              ? 'Verification In Progress'
              : verificationStatus === 'CHANGES_REQUESTED'
              ? 'Changes Requested by Faculty'
              : verificationStatus === 'REJECTED'
              ? 'Verification Rejected'
              : 'No Verified Portfolios Yet'}
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            {verificationStatus === 'PENDING'
              ? 'Your project evidence submission is currently under faculty review. Verified portfolio access will become available once endorsed.'
              : verificationStatus === 'CHANGES_REQUESTED'
              ? 'Faculty has requested modifications to your project evidence before endorsing your portfolio.'
              : verificationStatus === 'REJECTED'
              ? 'Your previous verification request was rejected. Please review feedback and resubmit when ready.'
              : 'Complete and submit faculty-reviewed project evidence to receive your verified credential portfolio.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="secondary" onClick={() => navigate('/dashboard/student')}>
              Back to Dashboard
            </Button>
            <Button variant="primary" onClick={() => navigate(ROUTES.PROJECTS)}>
              {verificationStatus === 'NOT_SUBMITTED' ? 'Submit Project for Verification' : 'View Projects'}
            </Button>
          </div>
        </SectionCard>
      ) : (
        <div className="space-y-6">
          {portfolios.map((p) => renderPortfolioCard(p, true))}
        </div>
      )}
    </div>
  );

  return certificateId ? <MainLayout>{content}</MainLayout> : <DashboardLayout>{content}</DashboardLayout>;
};

export default VerifiedPortfolio;
