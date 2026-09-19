import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, Brain, Briefcase, CheckCircle2, Clock3,
  FileText, Code2 as Github, Loader2, RefreshCw, ShieldCheck,
  Sparkles, Target, TrendingUp, Users, BarChart3, BookOpen, FolderGit2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { analyzeSkillGap, getAIResults, getRecommendations, runAIEvaluation } from '@/services/aiService';
import mentorshipService from '@/services/mentorshipService';
import { getErrorMessage } from '@/utils/formatters';

const unwrap = (response) => response?.data?.data ?? response?.data ?? response;
const formatDate = (value) => (value ? new Date(value).toLocaleString() : 'Not available');
const asList = (value) => (Array.isArray(value) ? value : []);

const STATUS_COPY = {
  NOT_EVALUATED: ['Not evaluated yet', 'Complete faculty verification before running AI evaluation. Run the pipeline after faculty verification is available.'],
  ELIGIBLE: ['Eligible for AI evaluation', 'Faculty-verified evidence is present. Run the AI evaluation to generate your verified portfolio score and insights.'],
  EVALUATING: ['Evaluation in progress', 'The evidence-backed pipeline is running.'],
  COMPLETED: ['Complete evaluation', 'All requested evidence sources returned usable results.'],
  PARTIAL: ['Partial evaluation', 'Some optional evidence sources are unavailable or failed.'],
  INSUFFICIENT_EVIDENCE: ['Faculty verification required', 'Complete faculty verification before running AI evaluation.'],
  FAILED: ['Evaluation failed', 'No fabricated result was stored. Try again when the AI service is available.'],
  UNAVAILABLE: ['AI service temporarily unavailable', 'The AI service could not be reached. Try again in a few moments.'],
  STALE: ['Portfolio changed since last evaluation', 'Re-evaluate to refresh the result from current verified evidence.'],
};

const scoreLabel = (value) => (value === null || value === undefined ? 'Unavailable' : `${Math.round(value)}/100`);

const TARGET_ROLES = [
  'Backend Developer',
  'Frontend Developer',
  'Full Stack Developer',
  'Data Scientist',
  'Machine Learning Engineer',
  'DevOps Engineer',
];

// Official portfolio component weights matching the FastAPI scoring engine
const COMPONENT_META = {
  complexity: { label: 'Complexity', weight: '25%' },
  technology_stack: { label: 'Technology Stack', weight: '20%' },
  github_activity: { label: 'GitHub Activity', weight: '15%' },
  documentation_quality: { label: 'Documentation', weight: '15%' },
  innovation: { label: 'Innovation', weight: '15%' },
  code_quality: { label: 'Code Quality', weight: '10%' },
};

const ScoreBar = ({ score, className = '' }) => {
  const pct = Math.min(Math.max(score ?? 0, 0), 100);
  const color = pct >= 70 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-slate-800 ${className}`} role="presentation">
      <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
};

const AIInsights = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  // Skill Gap interactive state
  const [selectedRole, setSelectedRole] = useState('Backend Developer');
  const [skillGapLoading, setSkillGapLoading] = useState(false);
  const [activeSkillGap, setActiveSkillGap] = useState(null);

  // Recommendations state
  const [recommendationsData, setRecommendationsData] = useState(null);

  // Student-to-Alumni Mentorship Request Modal
  const [mentorshipModalAlumni, setMentorshipModalAlumni] = useState(null);
  const [mentorshipSkill, setMentorshipSkill] = useState('');
  const [mentorshipMessage, setMentorshipMessage] = useState('');
  const [submittingMentorship, setSubmittingMentorship] = useState(false);
  const [mentorshipSuccessNotice, setMentorshipSuccessNotice] = useState('');

  const handleSendMentorshipRequest = async (e) => {
    e.preventDefault();
    if (!mentorshipModalAlumni || !mentorshipSkill || !mentorshipMessage) return;
    try {
      setSubmittingMentorship(true);
      await mentorshipService.requestMentorship({
        alumniId: mentorshipModalAlumni.id || mentorshipModalAlumni.alumniId,
        focusSkill: mentorshipSkill,
        message: mentorshipMessage,
      });
      setMentorshipSuccessNotice(`Mentorship inquiry sent to ${mentorshipModalAlumni.name}! You will be notified once scheduled.`);
      setMentorshipModalAlumni(null);
      setTimeout(() => setMentorshipSuccessNotice(''), 4500);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit mentorship inquiry.'));
    } finally {
      setSubmittingMentorship(false);
    }
  };

  const loadResults = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [aiRes, recsRes] = await Promise.allSettled([
        getAIResults(),
        getRecommendations(),
      ]);

      if (aiRes.status === 'fulfilled') {
        const all = unwrap(aiRes.value);
        setProfile(all);
        setHistory(all?.history || []);
        if (all?.skillGaps) {
          setActiveSkillGap(all.skillGaps);
        }
      } else if (aiRes.status === 'rejected') {
        setError(getErrorMessage(aiRes.reason, 'Unable to load the unified AI result.'));
      }
      if (recsRes.status === 'fulfilled') {
        setRecommendationsData(unwrap(recsRes.value));
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to load the unified AI result.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadResults(); }, [loadResults]);

  const handleRunSkillGap = async (roleToAnalyze) => {
    const role = roleToAnalyze || selectedRole;
    if (!role) return;

    setSkillGapLoading(true);
    try {
      const studentSkills = profile?.skills?.detected_skills || [];
      const res = await analyzeSkillGap({
        targetRole: role,
        currentSkills: studentSkills,
      });
      const gapData = unwrap(res)?.result || unwrap(res);
      setActiveSkillGap(gapData);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to compute skill gap analysis.'));
    } finally {
      setSkillGapLoading(false);
    }
  };

  const runEvaluation = async () => {
    setRunning(true);
    setError('');
    try {
      const targetRole = selectedRole;
      const response = await runAIEvaluation({
        force: profile?.status === 'STALE' || Boolean(profile?.evaluation),
        targetRole,
      });
      setProfile(unwrap(response));
      await loadResults();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to run the AI evaluation.'));
    } finally {
      setRunning(false);
    }
  };

  const status = profile?.status || 'NOT_EVALUATED';
  const [statusTitle, statusBody] = STATUS_COPY[status] || STATUS_COPY.NOT_EVALUATED;
  const evaluation = profile?.evaluation;
  const readinessScore = profile?.readiness?.readiness_score;
  const dataCompleteness = profile?.dataCompleteness || {};
  const canRun = user?.role === 'student' || user?.role === 'admin';
  const available = useMemo(() => asList(dataCompleteness.availableComponents), [dataCompleteness.availableComponents]);

  const alumniMentors = useMemo(() => (
    recommendationsData?.alumni || recommendationsData?.alumni_mentors || profile?.recommendations?.alumni || profile?.recommendations?.alumni_mentors || []
  ), [recommendationsData, profile]);

  const opportunities = useMemo(() => (
    recommendationsData?.opportunities || recommendationsData?.recruiter_opportunities || profile?.recommendations?.opportunities || profile?.recommendations?.recruiter_opportunities || []
  ), [recommendationsData, profile]);

  const skillsToDevelop = useMemo(() => (
    recommendationsData?.skills || recommendationsData?.skills_to_develop || profile?.recommendations?.skills || profile?.recommendations?.skills_to_develop || []
  ), [recommendationsData, profile]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[360px] items-center justify-center" aria-label="Loading AI results">
          <Loader2 className="h-6 w-6 animate-spin text-orange-300" aria-hidden="true" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">Evidence workspace</p>
            <h1 className="mt-2 flex items-center gap-3 text-2xl font-extrabold text-white">
              <Brain className="h-7 w-7 text-orange-300" aria-hidden="true" /> AI Insights &amp; Recommendations
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Transparent, evidence-grounded skill gap analysis and intelligent matching. Every recommendation is computed strictly from verified records and actual database entities.
            </p>
          </div>
          {canRun && (
            <Button
              onClick={runEvaluation}
              loading={running}
              leftIcon={status === 'NOT_EVALUATED' ? Sparkles : RefreshCw}
              aria-label={status === 'NOT_EVALUATED' ? 'Run AI Evaluation' : 'Re-evaluate AI pipeline'}
            >
              {status === 'NOT_EVALUATED' ? 'Run AI Evaluation' : 'Re-evaluate'}
            </Button>
          )}
        </div>

        {error && <div role="alert" className="rounded-lg border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

        {/* Pipeline Status Banner */}
        <section
          className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-5 sm:p-6"
          aria-label="AI pipeline status"
        >
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-start gap-3">
              {status === 'COMPLETED' ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-300" aria-hidden="true" />}
              <div>
                <p className="text-lg font-bold text-white">{statusTitle}</p>
                <p className="mt-1 text-sm text-slate-400">{statusBody}</p>
              </div>
            </div>
            <Badge variant={status === 'COMPLETED' ? 'success' : status === 'FAILED' ? 'danger' : 'warning'} dot>
              {status.replaceAll('_', ' ')}
            </Badge>
          </div>
          <div className="mt-5 grid gap-3 border-t border-slate-800/80 pt-4 text-xs text-slate-400 sm:grid-cols-4">
            <span>Last evaluated: <strong className="text-slate-200">{formatDate(profile?.lastUpdated)}</strong></span>
            <span>Evaluation version: <strong className="text-slate-200">{profile?.evaluationVersion || '—'}</strong></span>
            <span>Evidence sources: <strong className="text-slate-200">{available.length || 0} available</strong></span>
            <span>Verified portfolio: <strong className="text-slate-200">{dataCompleteness.verifiedPortfolio ? 'Yes' : 'No'}</strong></span>
          </div>
          {profile?.stale && (
            <p className="mt-4 rounded-md border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-200">
              Portfolio changed since last evaluation. Re-evaluate to refresh this result.
            </p>
          )}
        </section>

        {mentorshipSuccessNotice && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{mentorshipSuccessNotice}</span>
          </div>
        )}

        {/* Score Summary: Readiness + Portfolio */}
        <div className="grid gap-6 lg:grid-cols-3">
          <SectionCard title="Career readiness" action={<Target className="h-4 w-4 text-orange-300" aria-hidden="true" />}>
            <div role="region" aria-label="Career readiness score">
              {profile?.readiness ? (
                <>
                  <p className="text-4xl font-extrabold text-white" aria-label={`Readiness score: ${scoreLabel(readinessScore)}`}>
                    {scoreLabel(readinessScore)}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">{profile.readiness.category || 'Based on available evidence'}</p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-400" aria-label="Next steps">
                    {asList(profile.readiness.next_steps || profile.readiness.recommended_next_steps).slice(0, 4).map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-slate-500">Readiness is unavailable until supporting evidence is analyzable.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Portfolio analysis" action={<ShieldCheck className="h-4 w-4 text-orange-300" aria-hidden="true" />}>
            <div role="region" aria-label="Portfolio analysis score">
              {evaluation ? (
                <>
                  <p className="text-4xl font-extrabold text-white" aria-label={`Portfolio score: ${scoreLabel(evaluation.overallScore)}`}>
                    {scoreLabel(evaluation.overallScore)}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">{evaluation.category}</p>
                  <p className="mt-4 text-xs text-slate-500">Faculty verification remains the source of truth. AI assists with evidence synthesis.</p>
                </>
              ) : (
                <p className="text-sm text-slate-500">No faculty-verified portfolio evaluation is stored.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Extracted evidence skills" action={<TrendingUp className="h-4 w-4 text-orange-300" aria-hidden="true" />}>
            <div role="region" aria-label="Extracted skills">
              {profile?.skills?.detected_skills?.length ? (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {asList(profile.skills.detected_skills).map((skill) => (
                      <Badge key={skill} variant="blue">{skill}</Badge>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-slate-500">
                    Deduplicated from profile skills, verified project technologies, descriptions, and stored resume.
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500">No skill recommendations yet. Add your skills to improve matching.</p>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Portfolio Component Breakdown */}
        {evaluation?.componentScores && (
          <SectionCard
            title="Portfolio evidence breakdown"
            subtitle="Evidence-grounded component scores from verified project data. Scores come from the FastAPI engine — no values are recalculated here."
            action={<BarChart3 className="h-4 w-4 text-orange-300" aria-hidden="true" />}
          >
            <div role="region" aria-label="Portfolio component breakdown">
              <div className="space-y-4">
                {Object.entries(COMPONENT_META).map(([key, meta]) => {
                  const raw = evaluation.componentScores[key] ?? null;
                  const evidence = asList(evaluation.evidence?.[key]).slice(0, 2);
                  return (
                    <div key={key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">
                          {meta.label}
                          <span className="ml-1.5 text-[10px] font-normal text-slate-500">({meta.weight})</span>
                        </span>
                        <span className={`font-mono font-bold ${raw === null ? 'text-slate-500' : raw >= 70 ? 'text-emerald-400' : raw >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                          {raw === null ? '—' : `${Math.round(raw)}/100`}
                        </span>
                      </div>
                      <ScoreBar score={raw} />
                      {evidence.length > 0 && (
                        <ul className="space-y-0.5 pl-0.5">
                          {evidence.map((item, idx) => (
                            <li key={idx} className="text-[11px] text-slate-500 leading-snug">↳ {item}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Strengths & Improvements */}
              {(asList(evaluation.strengths).length > 0 || asList(evaluation.improvements).length > 0) && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 border-t border-slate-800/80 pt-5">
                  {asList(evaluation.strengths).length > 0 && (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Strengths
                      </p>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {asList(evaluation.strengths).map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {asList(evaluation.improvements).length > 0 && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-amber-300">
                        <Target className="h-3.5 w-3.5" aria-hidden="true" /> Improvement Areas
                      </p>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {asList(evaluation.improvements).map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Project-Level Evaluations */}
              {asList(evaluation.projectEvaluations || evaluation.project_evaluations).length > 0 && (
                <div className="mt-6 border-t border-slate-800/80 pt-5">
                  <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <FolderGit2 className="h-4 w-4 text-orange-300" aria-hidden="true" />
                    Verified Project-Level Evaluations ({asList(evaluation.projectEvaluations || evaluation.project_evaluations).length})
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {asList(evaluation.projectEvaluations || evaluation.project_evaluations).map((proj, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-white text-sm">{proj.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              {proj.deployment_url && (
                                <a
                                  href={proj.deployment_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-orange-300 hover:underline flex items-center gap-1"
                                >
                                  Live Demo
                                </a>
                              )}
                              {proj.github_url && (
                                <a
                                  href={proj.github_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-slate-400 hover:text-white hover:underline flex items-center gap-1"
                                >
                                  Repository
                                </a>
                              )}
                            </div>
                          </div>
                          <Badge variant={proj.project_score >= 80 ? 'success' : proj.project_score >= 60 ? 'warning' : 'danger'}>
                            {Math.round(proj.project_score)}/100
                          </Badge>
                        </div>
                        {proj.component_scores && (
                          <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-800/60 text-[10px]">
                            {Object.entries(proj.component_scores).map(([compKey, compScore]) => (
                              <div key={compKey} className="bg-slate-950/40 rounded p-1 text-center">
                                <span className="text-slate-500 block truncate capitalize">{compKey.replace('_', ' ')}</span>
                                <span className="font-mono font-bold text-slate-300">{Math.round(compScore)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {asList(proj.evidence).length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-semibold uppercase text-slate-500">Evidence Signals:</p>
                            <ul className="text-[11px] text-slate-400 space-y-0.5">
                              {asList(proj.evidence).slice(0, 3).map((ev, evIdx) => (
                                <li key={evIdx} className="truncate">↳ {ev}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Skill Gap Analysis */}
        <SectionCard
          title="Skill Gap Analysis"
          subtitle="Compare your verified skills against industry role expectations or opportunity requirements."
          action={<span className="text-xs font-mono uppercase tracking-wider text-orange-300">Target Role Model</span>}
        >
          <div className="space-y-6">
            {/* Target Role Selector */}
            <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Select target role for skill gap analysis">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Select Target Role:</span>
              <div className="flex flex-wrap gap-2">
                {TARGET_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role);
                      handleRunSkillGap(role);
                    }}
                    aria-pressed={selectedRole === role}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      selectedRole === role
                        ? 'border border-orange-500/40 bg-orange-500/15 text-orange-300'
                        : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {skillGapLoading ? (
              <div className="flex items-center justify-center py-8 text-xs text-slate-400" aria-live="polite">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-orange-300" aria-hidden="true" /> Computing skill coverage...
              </div>
            ) : activeSkillGap ? (
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-5 space-y-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Target Role</span>
                    <h3 className="text-lg font-bold text-white capitalize">{activeSkillGap.target_role || selectedRole}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Skill Coverage</span>
                    <p className="text-2xl font-black text-white" aria-label={`Skill coverage: ${activeSkillGap.coverage_percentage ?? 0}%`}>
                      {activeSkillGap.coverage_percentage ?? 0}%
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800/80" role="presentation" aria-hidden="true">
                  <div
                    className="h-full bg-linear-to-r from-orange-400 to-amber-300 transition-all duration-500"
                    style={{ width: `${Math.min(activeSkillGap.coverage_percentage || 0, 100)}%` }}
                  />
                </div>

                {/* Matched & Develop Grid */}
                <div className="grid gap-4 sm:grid-cols-2 pt-2">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Matched Skills ({asList(activeSkillGap.matched_skills).length})
                      </span>
                      <span className="text-[10px] text-emerald-500/80">Backed by real evidence</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {asList(activeSkillGap.matched_skills).length > 0 ? (
                        asList(activeSkillGap.matched_skills).map((skill) => (
                          <Badge key={skill} variant="emerald">{skill}</Badge>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">No matching skills identified for this role yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                        <Target className="h-3.5 w-3.5" aria-hidden="true" /> Skills to Develop ({asList(activeSkillGap.missing_skills).length})
                      </span>
                      <span className="text-[10px] text-amber-400/80">Recommended focus</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {asList(activeSkillGap.missing_skills).length > 0 ? (
                        asList(activeSkillGap.missing_skills).map((skill) => (
                          <Badge key={skill} variant="warning">{skill}</Badge>
                        ))
                      ) : (
                        <p className="text-xs text-emerald-400">Full requirement coverage achieved!</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recommended Learning Areas */}
                {asList(activeSkillGap.recommendations || activeSkillGap.recommended_learning_areas).length > 0 && (
                  <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Recommended Learning Areas</p>
                    <ul className="space-y-1.5 text-xs text-slate-400" aria-label="Recommended learning areas">
                      {asList(activeSkillGap.recommendations || activeSkillGap.recommended_learning_areas).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-orange-400" aria-hidden="true">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Select a target role above to analyze your skill gap coverage.
              </p>
            )}
          </div>
        </SectionCard>

        {/* Intelligent Matching (Alumni & Opportunities) */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Alumni Mentors */}
          <SectionCard
            title="Recommended Alumni Mentors"
            subtitle="Alumni matched through verified technical skill overlap, project domain, and cohort relevance."
            action={<Users className="h-4 w-4 text-orange-300" aria-hidden="true" />}
          >
            {alumniMentors.length > 0 ? (
              <div className="space-y-3.5" role="list" aria-label="Recommended alumni mentors">
                {alumniMentors.map((item) => (
                  <div
                    key={`alumni-${item.id || item.alumniId}`}
                    className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-4 hover:border-slate-700/80 transition-colors space-y-2.5"
                    role="listitem"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-white">{item.name}</h4>
                        <p className="text-xs text-slate-400">
                          {item.title ? `${item.title} • ` : ''}{item.organization || 'Alumni Member'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[11px] font-mono font-bold text-orange-300 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20"
                          aria-label={`Match score: ${Math.round(item.matchScore ?? item.match_score)}%`}
                        >
                          {Math.round(item.matchScore ?? item.match_score)}% Match
                        </span>
                      </div>
                    </div>

                    {asList(item.matchedSignals || item.matched_signals).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1" aria-label="Matching signals">
                        {asList(item.matchedSignals || item.matched_signals).map((sig, idx) => (
                          <span key={idx} className="text-[10px] rounded-sm bg-slate-900 border border-slate-800 px-1.5 py-0.5 text-slate-300">
                            {sig}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-slate-400 italic">{item.reason}</p>

                    <div className="pt-1 flex justify-end">
                      <Button
                        size="xs"
                        variant="secondary"
                        rightIcon={ArrowRight}
                        onClick={() => {
                          setMentorshipModalAlumni(item);
                          const primarySkill = item.matchedSkills?.[0] || item.matched_skills?.[0] || 'Technical Guidance';
                          setMentorshipSkill(primarySkill);
                          setMentorshipMessage('Hello! I noticed your profile through Vidyalink recommendation and would value your guidance on technical best practices and career roadmap.');
                        }}
                        aria-label={`Request mentorship from ${item.name}`}
                      >
                        Request Mentorship
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-8 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-600 mx-auto" aria-hidden="true" />
                <p className="text-xs text-slate-400 font-semibold">No matching alumni found.</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Add more verified project technologies or career interests to identify relevant alumni connections.
                </p>
              </div>
            )}
          </SectionCard>

          {/* Recruiter Opportunities */}
          <SectionCard
            title="Relevant Opportunities"
            subtitle="Recruiter project opportunities matched against your verified skills and portfolio evidence."
            action={<Briefcase className="h-4 w-4 text-orange-300" aria-hidden="true" />}
          >
            {opportunities.length > 0 ? (
              <div className="space-y-3.5" role="list" aria-label="Relevant opportunities">
                {opportunities.map((opp) => (
                  <div
                    key={`opp-${opp.id || opp.opportunityId}`}
                    className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-4 hover:border-slate-700/80 transition-colors space-y-2.5"
                    role="listitem"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-white">{opp.name}</h4>
                        <p className="text-xs text-slate-400">
                          {opp.title ? `${opp.title} • ` : ''}{opp.organization || 'Opportunity'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"
                          aria-label={`Match score: ${Math.round(opp.matchScore ?? opp.match_score)}%`}
                        >
                          {Math.round(opp.matchScore ?? opp.match_score)}% Match
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1" aria-label="Matched and missing skills">
                      {asList(opp.matchedSkills || opp.matched_skills).map((skill) => (
                        <Badge key={`m-${skill}`} variant="emerald" size="xs">{skill}</Badge>
                      ))}
                      {asList(opp.missingSkills || opp.missing_skills).map((skill) => (
                        <Badge key={`d-${skill}`} variant="warning" size="xs">Needs: {skill}</Badge>
                      ))}
                    </div>

                    <p className="text-xs text-slate-400 italic">{opp.reason}</p>

                    <div className="pt-1 flex justify-end">
                      <Button
                        size="xs"
                        variant="secondary"
                        rightIcon={ArrowRight}
                        onClick={() => navigate('/projects')}
                        aria-label={`View opportunity: ${opp.name}`}
                      >
                        Inspect Opportunity
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-8 text-center space-y-2">
                <Briefcase className="w-8 h-8 text-slate-600 mx-auto" aria-hidden="true" />
                <p className="text-xs text-slate-400 font-semibold">No matching opportunities available.</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Opportunities will appear as recruiters post projects matching your verified competencies.
                </p>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Skills to Develop Section */}
        {skillsToDevelop.length > 0 && (
          <SectionCard
            title="Skills to Develop"
            subtitle="Prioritized competencies identified from target roles and opportunity requirements."
            action={<TrendingUp className="h-4 w-4 text-orange-300" aria-hidden="true" />}
          >
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3" role="list" aria-label="Skills to develop">
              {skillsToDevelop.map((item, idx) => (
                <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-1" role="listitem">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-xs">{item.skill}</span>
                    <Badge variant={item.priority === 'high' ? 'warning' : 'default'} size="xs">
                      {item.priority || 'medium'} priority
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">{item.reason}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ATS Analysis — expanded with keyword and section details */}
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard
            title="ATS analysis"
            action={<FileText className="h-4 w-4 text-orange-300" aria-hidden="true" />}
          >
            <div role="region" aria-label="ATS analysis results">
              {profile?.ats ? (
                <div className="space-y-4">
                  <div>
                    <p
                      className="text-2xl font-bold text-white"
                      aria-label={`ATS score: ${scoreLabel(profile.ats.ats_score)}`}
                    >
                      {scoreLabel(profile.ats.ats_score)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Based on verified stored resume. Analysis generated on {formatDate(profile?.lastUpdated)}.</p>
                  </div>

                  {/* Sub-scores */}
                  {(profile.ats.keyword_match_score != null || profile.ats.skills_score != null) && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {[
                        { label: 'Keyword Match', value: profile.ats.keyword_match_score },
                        { label: 'Skills', value: profile.ats.skills_score },
                        { label: 'Education', value: profile.ats.education_score },
                        { label: 'Experience', value: profile.ats.experience_score },
                      ].filter((s) => s.value != null).map((s) => (
                        <div key={s.label} className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</p>
                          <p className={`mt-0.5 font-bold ${s.value >= 70 ? 'text-emerald-400' : s.value >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                            {Math.round(s.value)}/100
                          </p>
                          <ScoreBar score={s.value} className="mt-1" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Missing keywords */}
                  {asList(profile.ats.missing_keywords).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Missing Keywords</p>
                      <div className="flex flex-wrap gap-1.5">
                        {asList(profile.ats.missing_keywords).slice(0, 10).map((kw) => (
                          <span key={kw} className="text-[11px] rounded-md bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-red-300">{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {asList(profile.ats.suggestions).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Resume Suggestions</p>
                      <ul className="space-y-1 text-xs text-slate-400">
                        {asList(profile.ats.suggestions).slice(0, 4).map((s, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-orange-400 mt-0.5" aria-hidden="true">•</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  ATS analysis requires a stored resume. Upload a resume and re-evaluate.
                </p>
              )}
            </div>
          </SectionCard>

          {/* GitHub Analytics — expanded with factual metrics */}
          <SectionCard
            title="GitHub analytics"
            action={<Github className="h-4 w-4 text-orange-300" aria-hidden="true" />}
          >
            <div role="region" aria-label="GitHub analytics results">
              {profile?.github ? (
                <div className="space-y-4">
                  <div>
                    <p
                      className="text-2xl font-bold text-white"
                      aria-label={`GitHub activity score: ${scoreLabel(profile.github.derived_activity_score ?? profile.github.derived_score)}`}
                    >
                      {scoreLabel(profile.github.derived_activity_score ?? profile.github.derived_score)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Derived from actual GitHub account data. Factual metrics are never fabricated.</p>
                  </div>

                  {/* Factual metrics */}
                  {profile.github.factual_metrics && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {Object.entries(profile.github.factual_metrics).map(([key, value]) => (
                        <div key={key} className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{key.replaceAll('_', ' ')}</p>
                          <p className="mt-0.5 font-bold text-slate-200">{String(value ?? '—')}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Observations */}
                  {asList(profile.github.observations || profile.github.explanation).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Observations</p>
                      <ul className="space-y-1 text-xs text-slate-400">
                        {asList(profile.github.observations || profile.github.explanation).slice(0, 4).map((obs, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-orange-400 mt-0.5" aria-hidden="true">•</span>
                            {obs}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  GitHub analytics requires a connected GitHub account. Connect your account in Settings.
                </p>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Evaluation History */}
        <SectionCard
          title="Evaluation history"
          subtitle="Previous stored runs are retained for comparison; identical source versions are not duplicated unless you explicitly re-evaluate."
          action={<BookOpen className="h-4 w-4 text-orange-300" aria-hidden="true" />}
        >
          {history.length ? (
            <div className="overflow-x-auto" role="region" aria-label="Evaluation history table">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="pb-3" scope="col">Version</th>
                    <th className="pb-3" scope="col">Date</th>
                    <th className="pb-3" scope="col">Portfolio</th>
                    <th className="pb-3" scope="col">Readiness</th>
                    <th className="pb-3" scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={`${item.evaluationVersion}-${item.createdAt}`} className="border-t border-slate-800/70">
                      <td className="py-3 text-slate-200">v{item.evaluationVersion}</td>
                      <td className="py-3 text-slate-400">{formatDate(item.createdAt)}</td>
                      <td className="py-3 text-slate-200">{scoreLabel(item.overallScore)}</td>
                      <td className="py-3 text-slate-200">{scoreLabel(item.readinessScore)}</td>
                      <td className="py-3">
                        <Badge variant="slate">{(item.evaluationStatus || 'COMPLETED').replaceAll('_', ' ')}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No evaluation history is stored yet.</p>
          )}
        </SectionCard>

        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> AI-assisted recommendation engine. Faculty verification remains separate and authoritative. Analysis generated from verified portfolio evidence only.
        </p>
      </div>

      {/* Mentorship Inquiry Modal */}
      <Modal
        open={Boolean(mentorshipModalAlumni)}
        onClose={() => setMentorshipModalAlumni(null)}
        title="Request Alumni Mentorship"
        size="md"
      >
        {mentorshipModalAlumni && (
          <form onSubmit={handleSendMentorshipRequest} className="space-y-4 text-sm text-slate-300">
            <div>
              <p className="text-xs text-slate-400">Selected Alumni Mentor</p>
              <p className="text-base font-bold text-white">{mentorshipModalAlumni.name}</p>
              <p className="text-xs text-slate-400">
                {mentorshipModalAlumni.title ? `${mentorshipModalAlumni.title} • ` : ''}
                {mentorshipModalAlumni.organization || 'Alumni Member'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Focus Skill / Topic
              </label>
              <input
                type="text"
                required
                value={mentorshipSkill}
                onChange={(e) => setMentorshipSkill(e.target.value)}
                placeholder="e.g. System Design, Cloud Infrastructure, Interview Prep"
                className="form-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Inquiry Message
              </label>
              <textarea
                required
                rows={4}
                value={mentorshipMessage}
                onChange={(e) => setMentorshipMessage(e.target.value)}
                placeholder="Briefly describe what guidance or feedback you are seeking…"
                className="form-input"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button type="button" variant="ghost" onClick={() => setMentorshipModalAlumni(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" leftIcon={Users} disabled={submittingMentorship}>
                {submittingMentorship ? 'Sending…' : 'Send Inquiry'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </DashboardLayout>
  );
};

export default AIInsights;
