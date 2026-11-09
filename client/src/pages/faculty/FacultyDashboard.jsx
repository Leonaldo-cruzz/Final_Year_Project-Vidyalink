import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban, Users, ClipboardCheck,
  ShieldCheck, CheckCircle2,
  GraduationCap, Award, Clock, Loader2, Brain, FolderPlus
} from 'lucide-react';

import DashboardLayout from '@/layouts/DashboardLayout';
import { StatCard, SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/constants';
import { getFacultyVerificationDashboard } from '@/services/verificationService';
import { getProjects } from '@/services/projectService';
import { getVerificationTypeLabel } from '@/components/verification/verification.utils';

const FacultyDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Pending faculty verification requests (the real review workflow).
  const [queue, setQueue] = useState([]);
  const [summary, setSummary] = useState(null);
  // Opportunities this faculty member has posted for students.
  const [supervisedProjects, setSupervisedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchFacultyData = async () => {
      try {
        setLoading(true);
        setLoadError('');
        const [queueRes, postingsRes] = await Promise.allSettled([
          getFacultyVerificationDashboard({ status: 'PENDING', sort: 'OLDEST' }),
          getProjects({ type: 'opportunity', mine: true, limit: 20 }),
        ]);

        if (!isMounted) return;

        if (queueRes.status === 'fulfilled') {
          const dashboard = queueRes.value?.data || {};
          setSummary(dashboard.summary || null);
          const items = Array.isArray(dashboard.verifications) ? dashboard.verifications : [];
          setQueue(items.map((item) => ({
            id: item._id,
            studentName: item.student?.fullName || 'Student',
            studentRoll: item.student?.college && item.student.college !== 'Not provided' ? item.student.college : '',
            branch: item.student?.branch && item.student.branch !== 'Not provided' ? item.student.branch : '',
            typeLabel: getVerificationTypeLabel(item.targetType),
            priority: item.priority,
            submittedDate: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent',
          })));
        } else {
          setLoadError('Unable to load the verification queue.');
        }

        if (postingsRes.status === 'fulfilled') {
          const list = postingsRes.value?.data?.projects;
          setSupervisedProjects(Array.isArray(list) ? list : []);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFacultyData();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalApplicants = supervisedProjects.reduce((sum, p) => sum + (p.applicantCount || 0), 0);

  return (
    <DashboardLayout>
      {/* Faculty Academic Header */}
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
              <span className="text-slate-600">•</span>
              <span className="text-xs text-emerald-400 font-semibold">Faculty Chair</span>
            </div>

            <h1 className="page-title text-white text-2xl sm:text-3xl font-extrabold">
              Faculty Academic Verification Portal
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Welcome{user?.fullName ? `, ${user.fullName}` : ''}. Review student project deliverables, verify submitted evidence, and record authentic academic endorsements.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={ShieldCheck}
              onClick={() => navigate('/faculty/verifications')}
            >
              Verification Queue
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={FolderKanban}
              onClick={() => navigate(ROUTES.OPPORTUNITIES)}
            >
              My Opportunities
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={FolderPlus}
              onClick={() => navigate(ROUTES.CREATE_OPPORTUNITY)}
            >
              Post Opportunity
            </Button>
          </div>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-300">
          {loadError}
        </div>
      )}

      {/* Real Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
        <StatCard
          label="Posted Opportunities"
          value={supervisedProjects.length.toString()}
          icon={FolderKanban}
          color="purple"
        />
        <StatCard
          label="Applicants"
          value={totalApplicants.toString()}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Pending Reviews"
          value={String(summary?.pendingRequests ?? queue.length)}
          icon={ClipboardCheck}
          color="amber"
        />
        <StatCard
          label="Verified Today"
          value={String(summary?.verifiedToday ?? 0)}
          icon={Award}
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verification Queue (Primary Column) */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard
            title="Academic Verification Queue"
            subtitle="Student project evidence awaiting evaluation and faculty verification"
          >
            {loading ? (
              <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-orange-300" /> Loading verification queue…
              </div>
            ) : queue.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                <h4 className="text-sm font-bold text-white">No Pending Verification Requests</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Student project evidence submissions awaiting your evaluation will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 rounded-xl bg-slate-950/75 border border-slate-800 space-y-3 transition-all hover:border-slate-700"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{item.studentName}</span>
                          {item.studentRoll && (
                            <span className="text-[11px] text-slate-500 font-mono">({item.studentRoll})</span>
                          )}
                          <Badge variant="amber" size="sm">Awaiting Review</Badge>
                        </div>
                        <p className="text-xs font-semibold text-orange-300 mt-0.5">{item.typeLabel} verification</p>
                        {item.branch && <p className="text-xs text-slate-400 mt-1">{item.branch}</p>}
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <Button
                          size="sm"
                          variant="primary"
                          leftIcon={ShieldCheck}
                          onClick={() => navigate(`/faculty/verifications/${item.id}`)}
                        >
                          Review Evidence
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> Submitted: {item.submittedDate || 'Recent'}
                      </span>
                      {item.priority && <span className="text-slate-400 font-mono">Priority: {item.priority}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Supervised Projects */}
          <SectionCard
            title="My Posted Opportunities"
            subtitle="Opportunities you posted and the students applying to them"
          >
            {supervisedProjects.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <FolderKanban className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-white">No Opportunities Posted Yet</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Post a research, capstone or internship opportunity and review the students who apply.
                </p>
                <Button size="sm" variant="secondary" onClick={() => navigate(ROUTES.CREATE_OPPORTUNITY)}>
                  Create Project Opportunity
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {supervisedProjects.map((p) => (
                  <div
                    key={p._id || p.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-800/60 bg-slate-950/60 p-4 transition-colors hover:border-slate-700/60"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-100 truncate">{p.title}</p>
                        <Badge variant={p.projectStatus === 'Archived' ? 'slate' : 'emerald'} size="sm">
                          {p.projectStatus === 'Archived' ? 'Closed' : 'Open'}
                        </Badge>
                        <span className="text-[11px] text-slate-500">{p.applicantCount || 0} applicant(s)</span>
                      </div>
                      {p.technologies?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {p.technologies.map((t) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-400 font-mono">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/projects/${p._id || p.id}/applicants`)}
                      >
                        Applicants
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Column: Institutional Faculty Guidelines + AI Pipeline Overview */}
        <div className="space-y-6">
          <SectionCard title="Academic Verification Standards">
            <div className="space-y-4 text-xs leading-relaxed text-slate-300">
              <div className="p-3.5 rounded-xl bg-orange-300/10 border border-orange-300/20 text-orange-200">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-4 h-4 text-orange-300" aria-hidden="true" /> Faculty Verification
                </p>
                When you verify student project evidence, your verification is officially attached to the student's portfolio record, giving external reviewers genuine academic context.
              </div>

              <div className="border-b border-slate-800/70 pb-3">
                <p className="font-bold text-slate-200 text-sm">Evaluation Criteria</p>
                <p className="mt-1 text-slate-400">
                  Verify that project submissions run reliably, demonstrate solid architectural choices, and reflect authentic student contribution.
                </p>
              </div>

              <div className="border-b border-slate-800/70 pb-3">
                <p className="font-bold text-slate-200 text-sm">Connected Records</p>
                <p className="mt-1 text-slate-400">
                  Approved projects populate the student's verified portfolio and are visible to partner recruiters.
                </p>
              </div>

              <div>
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => navigate(ROUTES.OPPORTUNITIES)}
                >
                  Manage My Opportunities
                </Button>
              </div>
            </div>
          </SectionCard>

          {/* AI Pipeline Overview — read-only AI signal for faculty reference */}
          <SectionCard
            title="AI Pipeline Overview"
            action={<Brain className="h-4 w-4 text-orange-300" aria-hidden="true" />}
          >
            <div className="space-y-3" role="region" aria-label="AI pipeline guidance">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                AI-assisted analysis is a read-only signal. It does not determine faculty verification decisions.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Each student's AI portfolio evaluation is shown on the verification review page alongside their evidence.
              </p>
              <Button size="sm" variant="secondary" className="w-full" onClick={() => navigate('/faculty/verifications')}>
                Open Verification Queue
              </Button>
              <p className="text-[10px] text-slate-600 italic pt-1">
                Scores sourced from student's verified portfolio AI evaluation. Faculty verification is independent.
              </p>
            </div>
          </SectionCard>
        </div>
      </div>

    </DashboardLayout>
  );
};

export default FacultyDashboard;
