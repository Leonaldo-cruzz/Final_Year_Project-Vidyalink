import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban, Users, ClipboardCheck,
  ShieldCheck, CheckCircle2, ExternalLink,
  GraduationCap, Award, Clock, Loader2, Brain, FolderPlus
} from 'lucide-react';

import DashboardLayout from '@/layouts/DashboardLayout';
import { StatCard, SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/constants';
import api from '@/services/api';
import { getAIResults } from '@/services/aiService';

const FacultyDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [queue, setQueue] = useState([]);
  const [supervisedProjects, setSupervisedProjects] = useState([]);
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState(null);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [successToast, setSuccessToast] = useState('');
  // AI pipeline overview: map of portfolioId -> {score, status, category}
  const [aiSummaries, setAiSummaries] = useState({});

  useEffect(() => {
    let isMounted = true;

    const fetchFacultyData = async () => {
      try {
        setLoading(true);
        const [engRes, queueRes] = await Promise.allSettled([
          api.get('/engagements/faculty'),
          api.get('/milestones/pending-verification'),
        ]);

        if (!isMounted) return;

        let projects = [];
        if (engRes.status === 'fulfilled') {
          const engList = engRes.value?.data?.data || engRes.value?.data || [];
          const validEngs = Array.isArray(engList) ? engList : [];
          setEngagements(validEngs);
          projects = validEngs.map((e) => e.project || e.projectOpportunityId).filter(Boolean);
          setSupervisedProjects(projects);
        }

        if (queueRes.status === 'fulfilled') {
          const rawQueue = queueRes.value?.data?.data || queueRes.value?.data || [];
          const formattedQueue = (Array.isArray(rawQueue) ? rawQueue : []).map((m) => ({
            id: m._id,
            milestoneId: m._id,
            studentName: m.workspace?.student?.fullName || 'Student Candidate',
            studentRoll: m.workspace?.student?.college || '',
            projectTitle: m.workspace?.project?.title || 'Capstone Project',
            milestoneTitle: m.title,
            deliverableUrl: m.deliverableUrl,
            notes: m.deliverableNotes,
            submittedDate: m.submittedAt ? new Date(m.submittedAt).toLocaleDateString() : 'Recent',
          }));
          setQueue(formattedQueue);
        }

        // Fetch AI pipeline summary for each supervised project
        if (projects.length > 0) {
          const aiResults = await Promise.allSettled(
            projects.map((p) =>
              p._id
                ? getAIResults(p._id).catch(() => null)
                : Promise.resolve(null)
            )
          );
          if (!isMounted) return;
          const summaries = {};
          projects.forEach((p, idx) => {
            if (!p._id) return;
            const res = aiResults[idx];
            if (res?.status === 'fulfilled' && res.value) {
              const d = res.value?.data?.data ?? res.value?.data ?? res.value;
              summaries[p._id] = {
                status: d?.status || null,
                score: d?.evaluation?.overallScore ?? null,
                category: d?.evaluation?.category || null,
              };
            }
          });
          setAiSummaries(summaries);
        }
      } catch {
        // Honest state on failure: empty arrays
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFacultyData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenVerifyModal = (item) => {
    setActiveItem(item);
    setFeedbackNote('');
  };

  const handleConfirmVerification = async () => {
    if (!activeItem) return;
    try {
      if (activeItem.milestoneId) {
        await api.post(`/milestones/${activeItem.milestoneId}/verify`, {
          verificationStatus: 'verified',
          feedback: feedbackNote || 'Demonstrates academic competence.',
        });
      }
      setQueue((prev) => prev.filter((q) => q.id !== activeItem.id));
      setSuccessToast(`Successfully verified project evidence for ${activeItem.studentName || 'student'}!`);
      setActiveItem(null);
      setTimeout(() => setSuccessToast(''), 4000);
    } catch {
      setSuccessToast('Verification failed. Please try again.');
      setTimeout(() => setSuccessToast(''), 4000);
    }
  };

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
              onClick={() => navigate(ROUTES.PROJECTS)}
            >
              Supervised Projects
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={FolderPlus}
              onClick={() => navigate(ROUTES.CREATE_PROJECT)}
            >
              Post Project
            </Button>
          </div>
        </div>
      </div>

      {successToast && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-300">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            {successToast}
          </span>
          <button onClick={() => setSuccessToast('')} className="text-xs text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Real Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
        <StatCard
          label="Supervised Projects"
          value={supervisedProjects.length.toString()}
          icon={FolderKanban}
          color="purple"
        />
        <StatCard
          label="Active Engagements"
          value={engagements.length.toString()}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Pending Reviews"
          value={queue.length.toString()}
          icon={ClipboardCheck}
          color="amber"
        />
        <StatCard
          label="Faculty Endorsements"
          value="0"
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
                        <p className="text-xs font-semibold text-orange-300 mt-0.5">{item.projectTitle}</p>
                        <p className="text-xs text-slate-300 font-medium mt-1">{item.milestoneTitle}</p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        {item.deliverableUrl && (
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={ExternalLink}
                            onClick={() => window.open(item.deliverableUrl, '_blank')}
                          >
                            Deliverable
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="primary"
                          leftIcon={ShieldCheck}
                          onClick={() => handleOpenVerifyModal(item)}
                        >
                          Verify Evidence
                        </Button>
                      </div>
                    </div>

                    {item.notes && (
                      <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                        <span className="font-semibold text-slate-400 block mb-0.5">Candidate Submission Notes:</span>
                        {item.notes}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> Submitted: {item.submittedDate || 'Recent'}
                      </span>
                      <span className="text-slate-400 font-mono">Status: Ready for Evaluation</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Supervised Projects */}
          <SectionCard
            title="Supervised Student Projects"
            subtitle="Project tracking and verification status"
          >
            {supervisedProjects.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <FolderKanban className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-white">No Supervised Projects Registered</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Create project opportunities or connect student capstones to oversee milestone evidence and endorse credentials.
                </p>
                <Button size="sm" variant="secondary" onClick={() => navigate(ROUTES.CREATE_PROJECT)}>
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
                        <Badge variant={p.status === 'completed' ? 'emerald' : 'blue'} size="sm">
                          {p.status || 'Active'}
                        </Badge>
                      </div>
                      {p.skillsRequired?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {p.skillsRequired.map((t) => (
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
                        onClick={() => navigate(`/projects/${p._id || p.id}`)}
                      >
                        Inspect
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
                  onClick={() => navigate(ROUTES.PROJECTS)}
                >
                  View All Supervised Projects
                </Button>
              </div>
            </div>
          </SectionCard>

          {/* AI Pipeline Overview — read-only AI signal for faculty reference */}
          <SectionCard
            title="AI Pipeline Overview"
            action={<Brain className="h-4 w-4 text-orange-300" aria-hidden="true" />}
          >
            <div className="space-y-3" role="region" aria-label="AI pipeline status per supervised project">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                AI-assisted analysis is a read-only signal. It does not determine faculty verification decisions.
              </p>
              {loading ? (
                <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-300" aria-hidden="true" />
                  Loading AI pipeline status…
                </div>
              ) : supervisedProjects.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No supervised projects yet.</p>
              ) : (
                <div className="space-y-2">
                  {supervisedProjects.slice(0, 6).map((p) => {
                    const ai = aiSummaries[p._id] || {};
                    const scoreText = ai.score != null ? `${Math.round(ai.score)}/100` : null;
                    const hasAI = ai.status && ai.status !== 'NOT_EVALUATED';
                    return (
                      <div
                        key={p._id}
                        className="flex items-center justify-between rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-xs"
                      >
                        <span className="truncate font-medium text-slate-300 max-w-[60%]" title={p.title}>{p.title}</span>
                        <span className="shrink-0">
                          {hasAI ? (
                            <span className={`font-bold ${
                              ai.score >= 70 ? 'text-emerald-400' : ai.score >= 50 ? 'text-amber-400' : 'text-slate-400'
                            }`}>
                              {scoreText ?? '—'}
                            </span>
                          ) : (
                            <span className="text-slate-600">Not evaluated</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-[10px] text-slate-600 italic pt-1">
                Scores sourced from student's verified portfolio AI evaluation. Faculty verification is independent.
              </p>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Faculty Verification & Feedback Modal */}
      <Modal
        open={Boolean(activeItem)}
        onClose={() => setActiveItem(null)}
        title="Faculty Project Evidence Verification"
        size="md"
      >
        {activeItem && (
          <div className="space-y-4 text-sm text-slate-300">
            <div>
              <p className="text-xs text-slate-400">Candidate Student</p>
              <p className="text-base font-bold text-white">
                {activeItem.studentName} {activeItem.studentRoll ? `(${activeItem.studentRoll})` : ''}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Project Deliverable</p>
              <p className="font-semibold text-orange-300">{activeItem.projectTitle}</p>
              <p className="text-xs text-slate-300 mt-0.5">{activeItem.milestoneTitle}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Faculty Evaluator Feedback / Grade Note
              </label>
              <textarea
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                rows={3}
                className="form-input resize-none"
                placeholder="Enter evaluation notes..."
              />
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
              Confirming this verification will endorse the student's project evidence and update their academic portfolio record.
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button variant="ghost" onClick={() => setActiveItem(null)}>
                Cancel
              </Button>
              <Button variant="primary" leftIcon={ShieldCheck} onClick={handleConfirmVerification}>
                Verify & Endorse
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
};

export default FacultyDashboard;
