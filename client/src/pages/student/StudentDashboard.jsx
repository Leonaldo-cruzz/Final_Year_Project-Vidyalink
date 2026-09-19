import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  ArrowRight, Award, ShieldCheck, CheckCircle2,
  GraduationCap, Code2, FileText, Loader2,
  Clock, AlertTriangle, RefreshCw, FolderPlus
} from 'lucide-react';

import DashboardLayout from '@/layouts/DashboardLayout';
import { StatCard, SectionCard, ActionCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/constants';
import { getMyPortfolios } from '@/services/portfolioService';
import { getProjects } from '@/services/projectService';
import { getVerificationHistory } from '@/services/verificationService';
import { getCertificates } from '@/services/certificateService';
import { getStudentApplications } from '@/services/applicationService';
import { getGithubProfile } from '@/services/githubService';
import { getResume } from '@/services/resumeService';
import AIAnalysisPanel from './AIAnalysisPanel';
import PortfolioVerificationCard from '@/components/verification/PortfolioVerificationCard';
import SubmitVerificationModal from '@/components/verification/SubmitVerificationModal';

const STATUS_COLOR = {
  Applied:              { badge: 'amber',   label: 'Applied' },
  'Under Review':       { badge: 'amber',   label: 'Under Review' },
  Shortlisted:          { badge: 'blue',    label: 'Shortlisted' },
  'Interview Scheduled':{ badge: 'purple',  label: 'Interview' },
  Selected:             { badge: 'emerald', label: 'Selected' },
  Verified:             { badge: 'emerald', label: 'Faculty Verified' },
  Pending:              { badge: 'amber',   label: 'Pending' },
  'Changes Requested':  { badge: 'purple',  label: 'Changes Requested' },
  Rejected:             { badge: 'rose',    label: 'Rejected' },
};

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [portfolios, setPortfolios] = useState([]);
  const [projects, setProjects] = useState([]);
  const [verificationHistory, setVerificationHistory] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [applications, setApplications] = useState([]);
  const [githubConnected, setGithubConnected] = useState(false);
  const [hasResume, setHasResume] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        portfolioRes,
        projectRes,
        verifRes,
        certRes,
        appRes,
        githubRes,
        resumeRes
      ] = await Promise.allSettled([
        getMyPortfolios(),
        getProjects(),
        getVerificationHistory({ targetType: 'PROJECT' }),
        getCertificates(),
        getStudentApplications(),
        getGithubProfile(),
        getResume(),
      ]);

      if (portfolioRes.status === 'fulfilled') {
        setPortfolios(portfolioRes.value?.data || []);
      }
      if (projectRes.status === 'fulfilled') {
        setProjects(projectRes.value?.data || []);
      }
      if (verifRes.status === 'fulfilled') {
        setVerificationHistory(verifRes.value?.data || []);
      }
      if (certRes.status === 'fulfilled') {
        setCertificates(certRes.value?.data || []);
      }
      if (appRes.status === 'fulfilled') {
        setApplications(appRes.value?.data || []);
      }
      if (githubRes.status === 'fulfilled') {
        const ghData = githubRes.value?.data;
        setGithubConnected(ghData?.connectionStatus === 'Connected');
      }
      if (resumeRes.status === 'fulfilled') {
        setHasResume(Boolean(resumeRes.value?.data));
      }
    } catch {
      // Honest state on error: keep arrays empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Derive authentic verification state from actual database records
  const verificationState = useMemo(() => {
    if (portfolios.length > 0) {
      return {
        status: 'VERIFIED',
        latestRecord: portfolios[0],
      };
    }

    const latestVerif = verificationHistory[0] || null;

    if (latestVerif) {
      if (latestVerif.status === 'PENDING') {
        return { status: 'PENDING', latestRecord: latestVerif };
      }
      if (latestVerif.status === 'CHANGES_REQUESTED') {
        return { status: 'CHANGES_REQUESTED', latestRecord: latestVerif };
      }
      if (latestVerif.status === 'REJECTED') {
        return { status: 'REJECTED', latestRecord: latestVerif };
      }
      if (latestVerif.status === 'VERIFIED') {
        return { status: 'VERIFIED', latestRecord: latestVerif };
      }
    }

    return {
      status: 'NOT_SUBMITTED',
      latestRecord: null,
    };
  }, [portfolios, verificationHistory]);

  const hasProjects = projects.length > 0;
  const eligibleProjects = useMemo(() => {
    return projects.filter((p) =>
      p.title &&
      (p.shortDescription || p.description) &&
      (p.technologies?.length > 0 || p.techStack?.length > 0)
    );
  }, [projects]);
  const isEligible = eligibleProjects.length > 0;

  // Header dynamic CTA matching actual verification status
  const headerCTA = useMemo(() => {
    switch (verificationState.status) {
      case 'VERIFIED':
        return {
          label: 'Verified Portfolio',
          variant: 'secondary',
          icon: ShieldCheck,
          disabled: false,
          onClick: () => navigate('/portfolio'),
        };
      case 'PENDING':
        return {
          label: 'Verification Pending',
          variant: 'secondary',
          icon: Clock,
          disabled: true,
          onClick: () => {},
        };
      case 'CHANGES_REQUESTED':
        return {
          label: 'Review Changes',
          variant: 'primary',
          icon: AlertTriangle,
          disabled: false,
          onClick: () => setIsSubmitModalOpen(true),
        };
      case 'REJECTED':
        return {
          label: 'Resubmit for Verification',
          variant: 'secondary',
          icon: RefreshCw,
          disabled: false,
          onClick: () => setIsSubmitModalOpen(true),
        };
      case 'NOT_SUBMITTED':
      default:
        if (!hasProjects) {
          return {
            label: 'Add Project',
            variant: 'primary',
            icon: FolderPlus,
            disabled: false,
            onClick: () => navigate('/projects/new'),
          };
        }
        if (!isEligible) {
          return {
            label: 'Complete Portfolio',
            variant: 'secondary',
            icon: ArrowRight,
            disabled: false,
            onClick: () => navigate(ROUTES.PROJECTS),
          };
        }
        return {
          label: 'Submit for Verification',
          variant: 'primary',
          icon: ShieldCheck,
          disabled: false,
          onClick: () => setIsSubmitModalOpen(true),
        };
    }
  }, [verificationState.status, hasProjects, isEligible, navigate]);

  // Compute profile checklist and real completion percentage
  const profileChecklist = useMemo(() => {
    const hasBasic = Boolean(user?.fullName && user?.college);
    const hasPortfolio = portfolios.length > 0;
    const hasCert = certificates.length > 0;
    const hasApp = applications.length > 0;

    const items = [
      { label: 'Basic Info & Institution', done: hasBasic },
      { label: 'Faculty-Verified Project', done: hasPortfolio },
      { label: 'Academic Certificates', done: hasCert },
      { label: 'GitHub Account Linked', done: githubConnected },
      { label: 'Resume Uploaded', done: hasResume },
      { label: 'Application Submitted', done: hasApp },
    ];

    const doneCount = items.filter((i) => i.done).length;
    const percent = Math.round((doneCount / items.length) * 100);

    return { items, percent };
  }, [user, portfolios, certificates, githubConnected, hasResume, applications]);

  // Derived real activities from actual applications, certificates, and verifications
  const realActivities = useMemo(() => {
    const events = [];

    portfolios.forEach((p) => {
      events.push({
        id: `pf-${p._id || p.certificateId}`,
        text: `Faculty verified: "${p.projectTitle || 'Academic Project'}"`,
        status: 'Verified',
        date: new Date(p.issuedAt || p.createdAt || Date.now()),
      });
    });

    verificationHistory.forEach((v) => {
      if (v.status === 'CHANGES_REQUESTED') {
        events.push({
          id: `verif-${v._id}`,
          text: `Faculty requested changes on project verification`,
          status: 'Changes Requested',
          date: new Date(v.updatedAt || v.createdAt || Date.now()),
        });
      } else if (v.status === 'REJECTED') {
        events.push({
          id: `verif-${v._id}`,
          text: `Project verification rejected by faculty`,
          status: 'Rejected',
          date: new Date(v.updatedAt || v.createdAt || Date.now()),
        });
      } else if (v.status === 'PENDING') {
        events.push({
          id: `verif-${v._id}`,
          text: `Submitted project for faculty verification`,
          status: 'Pending',
          date: new Date(v.createdAt || Date.now()),
        });
      }
    });

    applications.forEach((a) => {
      events.push({
        id: `app-${a._id}`,
        text: `Application to "${a.project?.title || a.projectOpportunityId?.title || 'Project'}"`,
        status: a.status || 'Applied',
        date: new Date(a.updatedAt || a.createdAt || Date.now()),
      });
    });

    certificates.forEach((c) => {
      events.push({
        id: `cert-${c._id}`,
        text: `Certificate recorded: "${c.title}"`,
        status: c.status || 'Pending',
        date: new Date(c.createdAt || Date.now()),
      });
    });

    events.sort((a, b) => b.date - a.date);
    return events.slice(0, 5);
  }, [portfolios, verificationHistory, applications, certificates]);

  const featuredPortfolio = portfolios[0] || null;

  return (
    <DashboardLayout>
      {/* Institutional Academic Banner */}
      <div className="mb-6 rounded-xl border border-slate-800/80 bg-linear-to-r from-slate-900/90 via-slate-900/60 to-slate-950 p-5 sm:p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {user?.college && (
                <span className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-widest text-orange-300">
                  <GraduationCap className="h-3.5 w-3.5" /> {user.college}
                </span>
              )}
              {user?.branch && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs text-slate-400">{user.branch}</span>
                </>
              )}
              {user?.graduationYear && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs text-slate-400">Class of {user.graduationYear}</span>
                </>
              )}
            </div>

            <h1 className="page-title text-white text-2xl sm:text-3xl font-extrabold">
              Welcome back{user?.fullName ? `, ${user.fullName}` : ''}
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Your verified academic record, project evidence, and skill readiness signals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant={headerCTA.variant}
              size="sm"
              leftIcon={headerCTA.icon}
              disabled={headerCTA.disabled}
              onClick={headerCTA.onClick}
            >
              {headerCTA.label}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={FolderKanban}
              onClick={() => navigate(ROUTES.PROJECTS)}
            >
              Explore Projects
            </Button>
          </div>
        </div>
      </div>

      {/* Student Portfolio Verification Status Card */}
      <div className="mb-8">
        <PortfolioVerificationCard
          status={verificationState.status}
          verificationRecord={verificationState.latestRecord}
          hasProjects={hasProjects}
          isEligible={isEligible}
          onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
        />
      </div>

      {/* Real Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
        <StatCard
          label="Verified Portfolios"
          value={portfolios.length.toString()}
          icon={ShieldCheck}
          color="emerald"
        />
        <StatCard
          label="Academic Certificates"
          value={certificates.length.toString()}
          icon={Award}
          color="purple"
        />
        <StatCard
          label="Active Applications"
          value={applications.length.toString()}
          icon={FolderKanban}
          color="amber"
        />
        <StatCard
          label="Institutional Dossier"
          value={`${profileChecklist.percent}%`}
          icon={CheckCircle2}
          color="blue"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Featured Academic Project — Real Verified Records only */}
          <SectionCard
            title="Featured Academic Project"
            subtitle="Verified student capstone and research deliverables"
            action={
              featuredPortfolio ? (
                <button
                  type="button"
                  onClick={() => navigate('/portfolio')}
                  className="text-xs font-semibold text-orange-300 hover:text-orange-200 flex items-center gap-1 transition-colors"
                >
                  View Credential <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : null
            }
          >
            {loading ? (
              <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-orange-300" /> Loading portfolio records…
              </div>
            ) : featuredPortfolio ? (
              <div className="rounded-xl border border-emerald-500/25 bg-slate-950/70 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        Faculty Verified
                      </span>
                      {featuredPortfolio.certificateId && (
                        <span className="text-xs text-slate-500 font-mono">
                          ID: {featuredPortfolio.certificateId}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white">
                      {featuredPortfolio.projectTitle || 'Verified Capstone Project'}
                    </h3>
                    {featuredPortfolio.verifiedBy?.fullName && (
                      <p className="text-xs text-slate-400 mt-1">
                        Supervised by <strong>{featuredPortfolio.verifiedBy.fullName}</strong>
                      </p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate('/portfolio')}
                  >
                    Inspect Evidence
                  </Button>
                </div>

                {featuredPortfolio.milestonesSummary?.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    {featuredPortfolio.milestonesSummary.map((m, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs text-slate-200"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate font-medium">{m.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-8 text-center space-y-3">
                <FolderKanban className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">No Verified Projects Yet</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {verificationState.status === 'PENDING'
                    ? 'Your project evidence submission is currently under faculty review. It will appear here once verified.'
                    : verificationState.status === 'CHANGES_REQUESTED'
                    ? 'Faculty has requested modifications before endorsing your project evidence.'
                    : 'Complete and submit faculty-reviewed project evidence to build your verified credential portfolio.'}
                </p>
                {verificationState.status === 'PENDING' ? (
                  <Button size="sm" variant="secondary" onClick={() => navigate(ROUTES.PROJECTS)}>
                    View Submitted Projects
                  </Button>
                ) : hasProjects && isEligible ? (
                  <Button size="sm" variant="primary" leftIcon={ShieldCheck} onClick={() => setIsSubmitModalOpen(true)}>
                    Submit for Verification
                  </Button>
                ) : !hasProjects ? (
                  <Button size="sm" variant="primary" leftIcon={FolderPlus} onClick={() => navigate('/projects/new')}>
                    Add Project
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => navigate(ROUTES.PROJECTS)}>
                    Complete Portfolio
                  </Button>
                )}
              </div>
            )}
          </SectionCard>

          {/* Real Recent Activity */}
          <SectionCard
            title="Academic Signal Stream"
            subtitle="Verified credentials, project submissions, and platform activity"
            action={
              applications.length > 0 ? (
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.APPLICATIONS)}
                  className="text-xs font-semibold text-orange-300 hover:text-orange-200 flex items-center gap-1 transition-colors"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </button>
              ) : null
            }
          >
            {realActivities.length > 0 ? (
              <ul className="divide-y divide-slate-800/60" role="list">
                {realActivities.map((event) => {
                  const cfg = STATUS_COLOR[event.status] || {
                    badge: 'slate',
                    label: event.status,
                  };
                  return (
                    <li
                      key={event.id}
                      className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-orange-300" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-200 truncate">
                            {event.text}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {event.date.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={cfg.badge} size="sm">
                        {cfg.label}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-8 text-center">
                <p className="text-xs text-slate-500">No recent activity.</p>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right col */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <SectionCard title="Direct Actions">
            <div className="space-y-3">
              {verificationState.status === 'VERIFIED' ? (
                <ActionCard
                  label="Verified Portfolio"
                  desc="Review verified evidence & credentials"
                  icon={Award}
                  color="blue"
                  onClick={() => navigate('/portfolio')}
                />
              ) : hasProjects ? (
                <ActionCard
                  label={verificationState.status === 'PENDING' ? 'Verification In Review' : 'Submit for Verification'}
                  desc={verificationState.status === 'PENDING' ? 'Submission with faculty for review' : 'Submit project evidence for faculty review'}
                  icon={ShieldCheck}
                  color="amber"
                  onClick={() => {
                    if (verificationState.status !== 'PENDING') {
                      setIsSubmitModalOpen(true);
                    }
                  }}
                />
              ) : (
                <ActionCard
                  label="Add Project"
                  desc="Create your project to begin verification"
                  icon={FolderPlus}
                  color="blue"
                  onClick={() => navigate('/projects/new')}
                />
              )}
              <ActionCard
                label="Browse Projects"
                desc="Discover industry & research opportunities"
                icon={FolderKanban}
                color="emerald"
                onClick={() => navigate(ROUTES.PROJECTS)}
              />
              <ActionCard
                label="GitHub Integration"
                desc={githubConnected ? 'Manage connected repository sync' : 'Connect GitHub account'}
                icon={Code2}
                color="amber"
                onClick={() => navigate('/github')}
              />
              <ActionCard
                label="Update Resume & Skills"
                desc={hasResume ? 'Manage uploaded PDF resume' : 'Upload your resume PDF'}
                icon={FileText}
                color="purple"
                onClick={() => navigate('/resume')}
              />
            </div>
          </SectionCard>

          {/* Real Profile Completion */}
          <SectionCard title="Record Completeness">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Institutional Dossier</span>
                <span className="font-bold text-orange-300">{profileChecklist.percent}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-orange-300 transition-all duration-700"
                  style={{ width: `${profileChecklist.percent}%` }}
                />
              </div>
              <div className="space-y-2 pt-1">
                {profileChecklist.items.map(({ label, done }) => (
                  <div key={label} className="flex items-center gap-2.5 text-xs">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                        done
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-600'
                      }`}
                    >
                      {done ? '✓' : '○'}
                    </div>
                    <span className={done ? 'text-slate-200' : 'text-slate-500'}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* AI Analysis Panel — evidence-driven, no fake scores */}
          <AIAnalysisPanel
            hasPortfolio={portfolios.length > 0}
            hasResume={hasResume}
            hasGithub={githubConnected}
          />
        </div>
      </div>

      {/* Modal for Submitting Projects for Verification */}
      <SubmitVerificationModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        projects={projects}
        onSubmitted={() => {
          fetchDashboardData();
        }}
      />
    </DashboardLayout>
  );
};

export default StudentDashboard;
