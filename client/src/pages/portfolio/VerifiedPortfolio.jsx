import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Award, ShieldCheck, CheckCircle2, Share2, ExternalLink, Calendar, User, Building, Code2, Loader2, Sparkles } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { getMyPortfolios, verifyCertificate } from '@/services/portfolioService';
import { getErrorMessage } from '@/utils/formatters';

const VerifiedPortfolio = () => {
  const { certificateId } = useParams();
  const navigate = useNavigate();

  const [portfolios, setPortfolios] = useState([]);
  const [singlePortfolio, setSinglePortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchPortfolioData = async () => {
      try {
        setLoading(true);
        if (certificateId) {
          const res = await verifyCertificate(certificateId);
          setSinglePortfolio(res.data);
        } else {
          const res = await getMyPortfolios();
          setPortfolios(res.data || []);
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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

        <Button
          size="sm"
          variant="secondary"
          leftIcon={Share2}
          onClick={() => handleShare(p.certificateId)}
        >
          {copied ? 'Copied Public Link!' : 'Share Certificate'}
        </Button>
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
