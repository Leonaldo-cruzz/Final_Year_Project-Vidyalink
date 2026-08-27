import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FolderKanban,
  Plus,
  Clock,
  ExternalLink,
  Award,
  ArrowLeft,
  Loader2,
  Trash2,
  UploadCloud,
  ShieldCheck
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { getWorkspaceById } from '@/services/workspaceService';
import {
  getWorkspaceMilestones,
  createMilestone,
  deleteMilestone,
  submitDeliverable,
  verifyMilestone,
} from '@/services/milestoneService';
import { getErrorMessage } from '@/utils/formatters';

const milestoneSchema = z.object({
  title: z.string().min(3, 'Title required').max(150),
  description: z.string().min(5, 'Description required').max(2000),
  dueDate: z.string().min(1, 'Due date required'),
});

const deliverableSchema = z.object({
  deliverableUrl: z.string().url('Must be a valid URL'),
  deliverableNotes: z.string().max(2000).optional(),
});

const WorkspaceDetail = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [workspace, setWorkspace] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [submittingMilestone, setSubmittingMilestone] = useState(false);

  const [activeDeliverableMilestone, setActiveDeliverableMilestone] = useState(null);
  const [submittingDeliverable, setSubmittingDeliverable] = useState(false);

  const [activeVerifyMilestone, setActiveVerifyMilestone] = useState(null);
  const [verifyStatus, setVerifyStatus] = useState('verified');
  const [verifyFeedback, setVerifyFeedback] = useState('');
  const [submittingVerify, setSubmittingVerify] = useState(false);

  const isOwner = workspace?.owner?._id === user?._id || user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'recruiter';
  const isStudent = workspace?.student?._id === user?._id;

  const {
    register: regMilestone,
    handleSubmit: handleMilestoneSubmit,
    reset: resetMilestone,
    formState: { errors: milestoneErrors },
  } = useForm({ resolver: zodResolver(milestoneSchema) });

  const {
    register: regDeliverable,
    handleSubmit: handleDeliverableSubmit,
    reset: resetDeliverable,
    formState: { errors: deliverableErrors },
  } = useForm({ resolver: zodResolver(deliverableSchema) });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [wsRes, msRes] = await Promise.all([
        getWorkspaceById(workspaceId),
        getWorkspaceMilestones(workspaceId),
      ]);
      setWorkspace(wsRes.data);
      setMilestones(msRes.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) fetchData();
  }, [workspaceId, fetchData]);

  const onAddMilestone = async (data) => {
    try {
      setSubmittingMilestone(true);
      await createMilestone({
        workspaceId,
        ...data,
      });
      resetMilestone();
      setShowAddMilestone(false);
      await fetchData();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setSubmittingMilestone(false);
    }
  };

  const onDeleteMilestone = async (id) => {
    if (!window.confirm('Delete this milestone?')) return;
    try {
      await deleteMilestone(id);
      await fetchData();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const onSubmitDeliverable = async (data) => {
    if (!activeDeliverableMilestone) return;
    try {
      setSubmittingDeliverable(true);
      await submitDeliverable(activeDeliverableMilestone._id, data);
      resetDeliverable();
      setActiveDeliverableMilestone(null);
      await fetchData();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setSubmittingDeliverable(false);
    }
  };

  const onConfirmVerify = async () => {
    if (!activeVerifyMilestone) return;
    try {
      setSubmittingVerify(true);
      await verifyMilestone(activeVerifyMilestone._id, {
        status: verifyStatus,
        feedback: verifyFeedback.trim() || undefined,
      });
      setActiveVerifyMilestone(null);
      await fetchData();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setSubmittingVerify(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="py-24 text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading live project workspace...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !workspace) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error || 'Workspace unavailable.'}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => navigate('/workspaces')}
            className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Workspaces
          </button>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-extrabold text-white">
                  {workspace.project?.title}
                </h1>
                <Badge variant={workspace.status === 'completed' ? 'success' : 'info'}>
                  {workspace.status}
                </Badge>
              </div>
              <p className="text-sm text-slate-400 max-w-2xl">{workspace.project?.description}</p>
            </div>

            {workspace.status === 'completed' && (
              <Button
                variant="primary"
                leftIcon={Award}
                onClick={() => navigate('/portfolio/me')}
                className="bg-emerald-600 hover:bg-emerald-500 shrink-0"
              >
                View Verified Portfolio
              </Button>
            )}
          </div>
        </div>

        {/* Workspace Summary Bar */}
        <SectionCard>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Student info */}
            <div className="flex items-center gap-3">
              <Avatar src={workspace.student?.avatar} name={workspace.student?.fullName} size="md" />
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Candidate Student</span>
                <h4 className="text-sm font-bold text-white">{workspace.student?.fullName}</h4>
                <p className="text-xs text-slate-400">{workspace.student?.college}</p>
              </div>
            </div>

            {/* Mentor info */}
            <div className="flex items-center gap-3">
              <Avatar src={workspace.owner?.avatar} name={workspace.owner?.fullName} size="md" />
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Mentor / Recruiter</span>
                <h4 className="text-sm font-bold text-white">{workspace.owner?.fullName}</h4>
                <p className="text-xs text-slate-400">{workspace.owner?.email}</p>
              </div>
            </div>

            {/* Progress */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">Completion Progress</span>
                <span className="text-emerald-400 font-bold">{workspace.progressPercentage}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${workspace.progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Milestones Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-blue-400" /> Project Milestones & Deliverables
            </h2>

            {isOwner && workspace.status !== 'completed' && (
              <Button size="sm" leftIcon={Plus} onClick={() => setShowAddMilestone(true)}>
                Add Milestone
              </Button>
            )}
          </div>

          {milestones.length === 0 ? (
            <SectionCard className="text-center py-12">
              <p className="text-sm text-slate-400 mb-3">No milestones created yet for this project workspace.</p>
              {isOwner && (
                <Button size="sm" leftIcon={Plus} onClick={() => setShowAddMilestone(true)}>
                  Create First Milestone
                </Button>
              )}
            </SectionCard>
          ) : (
            <div className="space-y-4">
              {milestones.map((ms, idx) => (
                <SectionCard key={ms._id} className="relative">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h3 className="text-base font-bold text-white">{ms.title}</h3>
                        <Badge
                          variant={
                            ms.status === 'verified'
                              ? 'success'
                              : ms.status === 'submitted'
                              ? 'warning'
                              : ms.status === 'rejected'
                              ? 'danger'
                              : 'default'
                          }
                        >
                          {ms.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      <p className="text-xs text-slate-300 pl-9">{ms.description}</p>

                      <div className="pl-9 flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Due Date: {new Date(ms.dueDate).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Deliverable info if submitted/verified */}
                      {ms.deliverableUrl && (
                        <div className="ml-9 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs space-y-1.5 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-300">Submitted Deliverable:</span>
                            <a
                              href={ms.deliverableUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline inline-flex items-center gap-1"
                            >
                              View Submission <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          {ms.deliverableNotes && (
                            <p className="text-slate-400 italic">"{ms.deliverableNotes}"</p>
                          )}
                          {ms.feedback && (
                            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-amber-300 mt-1">
                              <strong>Reviewer Feedback:</strong> {ms.feedback}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Milestone Actions */}
                    <div className="flex items-center gap-2 pl-9 md:pl-0 pt-2 md:pt-0 shrink-0">
                      {isStudent && ms.status !== 'verified' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={UploadCloud}
                          onClick={() => {
                            setActiveDeliverableMilestone(ms);
                            resetDeliverable({ deliverableUrl: ms.deliverableUrl || '', deliverableNotes: ms.deliverableNotes || '' });
                          }}
                        >
                          {ms.deliverableUrl ? 'Re-submit' : 'Submit Deliverable'}
                        </Button>
                      )}

                      {isOwner && ms.status === 'submitted' && (
                        <Button
                          size="sm"
                          variant="primary"
                          leftIcon={ShieldCheck}
                          onClick={() => {
                            setActiveVerifyMilestone(ms);
                            setVerifyStatus('verified');
                            setVerifyFeedback('');
                          }}
                        >
                          Verify Deliverable
                        </Button>
                      )}

                      {isOwner && (
                        <button
                          onClick={() => onDeleteMilestone(ms._id)}
                          className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Delete Milestone"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </SectionCard>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Add Milestone */}
        <Modal
          open={showAddMilestone}
          onClose={() => setShowAddMilestone(false)}
          title="Create New Milestone"
          size="md"
        >
          <form onSubmit={handleMilestoneSubmit(onAddMilestone)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Milestone Title *
              </label>
              <input
                {...regMilestone('title')}
                type="text"
                placeholder="e.g. Architecture Setup & Database Design"
                className={`form-input ${milestoneErrors.title ? 'error' : ''}`}
              />
              {milestoneErrors.title && <p className="mt-1 text-xs text-red-400">{milestoneErrors.title.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Description *
              </label>
              <textarea
                {...regMilestone('description')}
                rows={3}
                placeholder="Detail the expected key deliverables and criteria..."
                className={`form-input resize-none ${milestoneErrors.description ? 'error' : ''}`}
              />
              {milestoneErrors.description && <p className="mt-1 text-xs text-red-400">{milestoneErrors.description.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Due Date *
              </label>
              <input
                {...regMilestone('dueDate')}
                type="date"
                className={`form-input ${milestoneErrors.dueDate ? 'error' : ''}`}
              />
              {milestoneErrors.dueDate && <p className="mt-1 text-xs text-red-400">{milestoneErrors.dueDate.message}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowAddMilestone(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={submittingMilestone}>
                Create Milestone
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Submit Deliverable */}
        <Modal
          open={Boolean(activeDeliverableMilestone)}
          onClose={() => setActiveDeliverableMilestone(null)}
          title={`Submit Deliverable: ${activeDeliverableMilestone?.title}`}
          size="md"
        >
          <form onSubmit={handleDeliverableSubmit(onSubmitDeliverable)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Deliverable / Repository / PR Link *
              </label>
              <input
                {...regDeliverable('deliverableUrl')}
                type="url"
                placeholder="https://github.com/org/repo/pull/12"
                className={`form-input ${deliverableErrors.deliverableUrl ? 'error' : ''}`}
              />
              {deliverableErrors.deliverableUrl && (
                <p className="mt-1 text-xs text-red-400">{deliverableErrors.deliverableUrl.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Submission Notes
              </label>
              <textarea
                {...regDeliverable('deliverableNotes')}
                rows={3}
                placeholder="Provide notes on your implementation or instructions to test..."
                className="form-input resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setActiveDeliverableMilestone(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={submittingDeliverable}>
                Submit for Verification
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Verify Deliverable */}
        <Modal
          open={Boolean(activeVerifyMilestone)}
          onClose={() => setActiveVerifyMilestone(null)}
          title={`Verify Deliverable: ${activeVerifyMilestone?.title}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <span className="font-semibold text-slate-300">Submitted Deliverable URL:</span>
              <a
                href={activeVerifyMilestone?.deliverableUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline block truncate"
              >
                {activeVerifyMilestone?.deliverableUrl}
              </a>
              {activeVerifyMilestone?.deliverableNotes && (
                <p className="text-slate-400 pt-1">Notes: "{activeVerifyMilestone.deliverableNotes}"</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Verification Decision *
              </label>
              <select
                value={verifyStatus}
                onChange={(e) => setVerifyStatus(e.target.value)}
                className="form-input"
              >
                <option value="verified">Approve & Mark Verified</option>
                <option value="rejected">Request Revisions (Reject Submission)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Feedback / Comments
              </label>
              <textarea
                value={verifyFeedback}
                onChange={(e) => setVerifyFeedback(e.target.value)}
                rows={3}
                placeholder="Feedback for the student candidate..."
                className="form-input resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setActiveVerifyMilestone(null)}>
                Cancel
              </Button>
              <Button loading={submittingVerify} onClick={onConfirmVerify}>
                Complete Review
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default WorkspaceDetail;
