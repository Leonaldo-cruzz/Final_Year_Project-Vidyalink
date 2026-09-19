import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Brain, CheckCircle2, ExternalLink, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { getAIResults, runAIEvaluation } from '@/services/aiService';
import { getErrorMessage } from '@/utils/formatters';

const unwrap = (response) => response?.data?.data ?? response?.data ?? response;
const score = (value) => value === null || value === undefined ? 'Unavailable' : `${Math.round(value)}/100`;

/** One dashboard summary backed by the same unified result used by /ai-insights. */
const AIAnalysisPanel = ({ hasPortfolio }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setProfile(unwrap(await getAIResults()));
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to load the unified AI summary.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const run = async () => {
    setRunning(true);
    setError('');
    try {
      setProfile(unwrap(await runAIEvaluation({ force: true })));
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to run the AI evaluation.'));
    } finally {
      setRunning(false);
    }
  };

  const status = profile?.status || 'NOT_EVALUATED';

  return (
    <SectionCard
      title="AI-assisted summary"
      subtitle="One unified result from verified portfolio evidence"
      action={<span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500"><Brain className="h-3 w-3" /> AI-assisted</span>}
    >
      {loading ? (
        <div className="flex items-center justify-center py-8 text-slate-400"><Loader2 className="mr-2 h-4 w-4 animate-spin text-orange-300" /> Loading latest result…</div>
      ) : error ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {error}</div><button type="button" onClick={load} className="mt-3 inline-flex items-center gap-1 text-xs text-red-200"><RefreshCw className="h-3 w-3" /> Retry</button></div>
      ) : !hasPortfolio || status === 'INSUFFICIENT_EVIDENCE' ? (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-sm font-semibold text-amber-200">Complete faculty verification before running AI evaluation.</p>
          <p className="mt-1 text-xs text-amber-200/70">Institutional AI analysis requires at least one faculty-verified project portfolio.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-300" /><div><p className="text-sm font-bold text-white">{profile?.evaluation ? `Portfolio ${score(profile.evaluation.overallScore)}` : 'Not evaluated yet'}</p><p className="text-xs text-slate-500">{profile?.readiness ? `Readiness ${score(profile.readiness.readiness_score)}` : 'Optional evidence results are shown when available.'}</p></div></div>
            <Badge variant={status === 'COMPLETED' ? 'success' : 'warning'}>{status.replaceAll('_', ' ')}</Badge>
          </div>
          {/* Compact Top Recommendations Preview */}
          {profile?.recommendations && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Intelligent Matches</p>
              {profile.recommendations.alumni_mentors?.[0] ? (
                <div className="rounded-lg bg-slate-950/60 border border-slate-800/70 p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{profile.recommendations.alumni_mentors[0].name}</span>
                    <span className="text-[10px] font-mono font-bold text-orange-300">
                      {Math.round(profile.recommendations.alumni_mentors[0].match_score ?? profile.recommendations.alumni_mentors[0].matchScore)}% match
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 italic line-clamp-2">
                    {profile.recommendations.alumni_mentors[0].reason}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">No matching alumni mentors yet.</p>
              )}

              {profile.recommendations.recruiter_opportunities?.[0] ? (
                <div className="rounded-lg bg-slate-950/60 border border-slate-800/70 p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{profile.recommendations.recruiter_opportunities[0].name}</span>
                    <span className="text-[10px] font-mono font-bold text-emerald-400">
                      {Math.round(profile.recommendations.recruiter_opportunities[0].match_score ?? profile.recommendations.recruiter_opportunities[0].matchScore)}% match
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 italic line-clamp-2">
                    {profile.recommendations.recruiter_opportunities[0].reason}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">No matching opportunities yet.</p>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={run} loading={running} leftIcon={profile?.evaluation ? RefreshCw : Sparkles}>
              {profile?.evaluation ? 'Re-evaluate' : 'Run AI Evaluation'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate('/ai-insights')} rightIcon={ExternalLink}>
              Open AI Insights
            </Button>
          </div>
        </>
      )}
    </SectionCard>
  );
};

export default AIAnalysisPanel;
