import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Award, ShieldCheck, CheckCircle2, Share2, Calendar, User, Building, Loader2, Globe2, LockKeyhole } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { getMyPortfolios, verifyCertificate } from '@/services/portfolioService';
import { getPortfolioAISummary, getPublicPortfolioAISummary, updatePortfolioVisibility } from '@/services/aiService';
import AIOverviewCard from '@/components/ai/AIOverviewCard';
import GitHubActivityCard from '@/components/ai/GitHubActivityCard';
import IndustryReadinessCard from '@/components/ai/IndustryReadinessCard';
import RecommendationList from '@/components/ai/RecommendationList';
import SkillEvidence from '@/components/ai/SkillEvidence';
import SkillGapList from '@/components/ai/SkillGapList';
import { getErrorMessage } from '@/utils/formatters';

const VerifiedPortfolio = () => {
  const { certificateId } = useParams();
  const navigate = useNavigate();

  const [portfolios, setPortfolios] = useState([]);
  const [singlePortfolio, setSinglePortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [aiSummaries, setAiSummaries] = useState({});
  const [aiErrors, setAiErrors] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [publicAISummary, setPublicAISummary] = useState(null);
  const [publicAIError, setPublicAIError] = useState('');
  const [publicAILoaded, setPublicAILoaded] = useState(false);
  const [visibilityUpdating, setVisibilityUpdating] = useState('');
  const [visibilityError, setVisibilityError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const fetchPrivateAISummaries = async (items) => {
      if (items.length === 0) return;
      setAiLoading(true);
      const entries = await Promise.all(items.map(async (portfolio) => {
        const portfolioKey = String(portfolio._id || portfolio.certificateId);
        try {
          const response = await getPortfolioAISummary(portfolio._id);
          return { portfolioKey, summary: response.data || null };
        } catch (err) {
          return { portfolioKey, error: getErrorMessage(err) };
        }
      }));

      if (!cancelled) {
        setAiSummaries(Object.fromEntries(entries.map(({ portfolioKey, summary }) => [portfolioKey, summary])));
        setAiErrors(Object.fromEntries(entries.filter(({ error }) => error).map(({ portfolioKey, error }) => [portfolioKey, error])));
        setAiLoading(false);
      }
    };

    const fetchPortfolioData = async () => {
      try {
        setLoading(true);
        setError('');
        setPublicAISummary(null);
        setPublicAIError('');
        setPublicAILoaded(false);
        if (certificateId) {
          const res = await verifyCertificate(certificateId);
          if (cancelled) return;
          const portfolio = res.data;
          setSinglePortfolio(portfolio);
          setLoading(false);

          if (portfolio?.isPublic && portfolio?._id) {
            try {
              const aiResponse = await getPublicPortfolioAISummary(portfolio._id);
              if (!cancelled) {
                setPublicAISummary(aiResponse.data || null);
                setPublicAILoaded(true);
              }
            } catch (err) {
              if (!cancelled) {
                setPublicAIError(getErrorMessage(err));
                setPublicAILoaded(true);
              }
            }
          }
        } else {
          const res = await getMyPortfolios();
          const items = res.data || [];
          if (cancelled) return;
          setPortfolios(items);
          setLoading(false);
          fetchPrivateAISummaries(items);
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPortfolioData();

    return () => { cancelled = true; };
  }, [certificateId]);

  const handleShare = (certId) => {
    const url = `${window.location.origin}/portfolio/verify/${certId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVisibilityToggle = async (portfolio) => {
    const portfolioKey = String(portfolio._id || portfolio.certificateId);
    setVisibilityUpdating(portfolioKey);
    setVisibilityError('');
    try {
      const response = await updatePortfolioVisibility(portfolio._id, !portfolio.isPublic);
      const updated = response.data;
      setPortfolios((current) => current.map((item) => (item._id === portfolio._id ? { ...item, ...updated } : item)));
    } catch (err) {
      setVisibilityError(getErrorMessage(err));
    } finally {
      setVisibilityUpdating('');
    }
  };

  const renderAISections = (p) => {
    const portfolioKey = String(p._id || p.certificateId);
    const summary = aiSummaries[portfolioKey];

    return (
      <div className="space-y-4 pt-2">
        <AIOverviewCard summary={summary} loading={aiLoading && !summary} error={aiErrors[portfolioKey] || ''} />
        <IndustryReadinessCard result={summary?.industryReadiness} />
        <div className="grid gap-4 lg:grid-cols-2">
          <GitHubActivityCard analytics={summary?.githubAnalytics} />
          <SkillEvidence profile={summary?.skillProfile} skills={summary?.skills} />
        </div>
        <SkillGapList gaps={summary?.skillGaps} />
        <RecommendationList recommendations={summary?.recommendations || []} />
      </div>
    );
  };

  const renderPublicAISections = () => {
    if (!singlePortfolio?.isPublic) return null;

    const verifiedSkillItems = (publicAISummary?.verifiedSkills || []).map((name) => ({ name }));
    const publicSummary = publicAISummary ? {
      portfolioScore: publicAISummary.portfolioScore,
      industryReadiness: publicAISummary.industryReadiness,
    } : null;

    return (
      <div className="space-y-4 pt-2">
        <AIOverviewCard summary={publicSummary} loading={!publicAILoaded && !publicAIError} error={publicAIError} publicView />
        {publicAISummary && <IndustryReadinessCard result={publicAISummary.industryReadiness} />}
        {publicAISummary && <SkillEvidence skills={verifiedSkillItems} verifiedOnly />}
      </div>
    );
  };

  const renderPortfolioCard = (p) => (
    <SectionCard key={p._id || p.certificateId} className="border-emerald-500/30 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-6 md:p-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-white">Verified Live Project Certificate</h2>
              <Badge variant="success">Authentic</Badge>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {p.certificateId}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!certificateId && (
            <Button
              size="sm"
              variant={p.isPublic ? 'ghost' : 'success'}
              leftIcon={p.isPublic ? LockKeyhole : Globe2}
              loading={visibilityUpdating === String(p._id || p.certificateId)}
              onClick={() => handleVisibilityToggle(p)}
            >
              {p.isPublic ? 'Keep AI private' : 'Make AI public'}
            </Button>
          )}
          <Button size="sm" variant="secondary" leftIcon={Share2} onClick={() => handleShare(p.certificateId)}>
            {copied ? 'Copied Public Link!' : 'Share Certificate'}
          </Button>
        </div>
      </div>

      {/* Project & Student Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Verified Project</span>
          <h3 className="text-xl font-bold text-white">{p.projectTitle}</h3>
          
          {p.skillsVerified?.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {p.skillsVerified.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-300"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <User className="w-4 h-4 text-blue-400" />
            <span>Candidate Student: <strong>{p.student?.fullName}</strong></span>
          </div>
          {p.student?.college && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Building className="w-4 h-4 text-purple-400" />
              <span>Institution: {p.student.college}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Award className="w-4 h-4 text-emerald-400" />
            <span>Verified By: <strong>{p.verifiedBy?.fullName}</strong> ({p.verifiedBy?.role})</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Issued Date: {new Date(p.issuedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Milestones Breakdown */}
      {p.milestonesSummary?.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Completed & Verified Milestones
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {p.milestonesSummary.map((m, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-200"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold truncate">{m.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hash Seal */}
      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2 font-mono">
        <span className="truncate">Crypto Hash: {p.verificationHash}</span>
        <span className="text-emerald-400/90 font-semibold shrink-0">VIDYALINK Trust Engine</span>
      </div>

      {!certificateId && (
        <p className="flex items-center gap-2 text-xs text-slate-500"><LockKeyhole className="h-3.5 w-3.5" /> AI results are private until you explicitly make them public.</p>
      )}
      {visibilityError && !certificateId && <p className="text-xs text-rose-300">{visibilityError}</p>}

      {certificateId ? renderPublicAISections() : renderAISections(p)}
    </SectionCard>
  );

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Verified Student Portfolios</h1>
          <p className="text-sm text-slate-400">Cryptographically verifiable project credentials and milestone execution certificates.</p>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Verifying credential integrity...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        ) : certificateId ? (
          singlePortfolio ? (
            renderPortfolioCard(singlePortfolio)
          ) : (
            <SectionCard className="text-center py-12">
              <p className="text-sm text-slate-400">Certificate not found.</p>
            </SectionCard>
          )
        ) : portfolios.length === 0 ? (
          <SectionCard className="text-center py-16">
            <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Verified Portfolios Yet</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
              Complete 100% of milestones in a Live Project Workspace to unlock your verified credential portfolio.
            </p>
            <Button onClick={() => navigate('/workspaces')}>View Workspaces</Button>
          </SectionCard>
        ) : (
          <div className="space-y-6">
            {portfolios.map((p) => renderPortfolioCard(p))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default VerifiedPortfolio;
