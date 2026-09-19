import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Code2 as Github,
  Download,
  ExternalLink,
  Eye,
  FileText,
  FolderKanban,
  GraduationCap,
  Mail,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  Brain,
  Sparkles,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import DashboardLayout from '@/layouts/DashboardLayout';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { SectionCard } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { FullPageSpinner } from '@/components/ui/Spinner';
import VerificationHistory from '@/components/verification/VerificationHistory';
import VerificationActionModal from '@/components/verification/VerificationActionModal';
import {
  approveVerification,
  getFacultyVerificationDetail,
  rejectVerification,
  requestVerificationChanges,
} from '@/services/verificationService';
import { getLatestAIResults } from '@/services/aiService';
import { useAuth } from '@/context/AuthContext';
import { formatDate, getErrorMessage } from '@/utils/formatters';
import { getStatusConfig, getVerificationTypeLabel } from '@/components/verification/verification.utils';

const DetailEmptyState = ({ title, message, icon: Icon }) => (
  <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center">
    <Icon className="mx-auto h-6 w-6 text-slate-600 mb-2" />
    <p className="text-sm font-semibold text-slate-300">{title}</p>
    <p className="mt-1 text-xs text-slate-500">{message}</p>
  </div>
);

const VerificationDetail = () => {
  const { verificationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [activeAction, setActiveAction] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewDocumentUrl, setPreviewDocumentUrl] = useState(null);
  const [previewDocumentTitle, setPreviewDocumentTitle] = useState('');
  const [aiInsight, setAiInsight] = useState(null);

  const loadDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getFacultyVerificationDetail(verificationId);
      setDetail(response.data);
      const portfolioId = response.data?.portfolio?._id;
      if (portfolioId) {
        getLatestAIResults(portfolioId)
          .then((aiRes) => setAiInsight(aiRes.data?.data || aiRes.data))
          .catch(() => setAiInsight(null));
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to load this verification request'));
    } finally {
      setLoading(false);
    }
  }, [verificationId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleDecision = async (remarks) => {
    if (!activeAction || !detail?.verification) return;

    const actionMethods = {
      approve: approveVerification,
      reject: rejectVerification,
      'request-changes': requestVerificationChanges,
    };

    try {
      setSubmitting(true);
      setError('');
      await actionMethods[activeAction](detail.verification._id, remarks || undefined);
      setActiveAction(null);
      setNotice(
        activeAction === 'approve'
          ? 'Verification approved successfully!'
          : activeAction === 'reject'
            ? 'Verification rejected. Feedback has been recorded for the student.'
            : 'Change request submitted successfully.'
      );
      await loadDetail();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to process the verification decision'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <FullPageSpinner message="Loading verification details…" />;

  if (!detail || !detail.verification) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-500/25 bg-red-500/10 p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
          <h1 className="mt-3 text-lg font-bold text-white">Verification request unavailable</h1>
          <p className="mt-1 text-sm text-red-300">{error || 'The requested verification was not found.'}</p>
          <Button className="mt-5" variant="outline" onClick={() => navigate('/faculty/verifications')}>
            Return to Verification Queue
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const { verification, targetItem, portfolio, history } = detail;
  const statusConfig = getStatusConfig(verification.status);
  const showActions = verification.status === 'PENDING' || user?.role === 'admin';
  const targetType = verification.targetType;

  // Resolve target asset: targetItem if present, or find by targetId in portfolio
  let targetProject = targetType === 'PROJECT'
    ? (targetItem || portfolio.projects?.find((p) => String(p._id) === String(verification.targetId)))
    : null;
  let targetCertificate = targetType === 'CERTIFICATE'
    ? (targetItem || portfolio.certificates?.find((c) => String(c._id) === String(verification.targetId)))
    : null;
  let targetResume = targetType === 'RESUME' ? (targetItem || portfolio.resume) : null;
  let targetGithub = targetType === 'GITHUB' ? (targetItem || portfolio.github) : null;
  let targetProfile = targetType === 'PROFILE' ? (targetItem || portfolio.profile) : null;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Navigation Breadcrumb */}
        <button
          type="button"
          onClick={() => navigate('/faculty/verifications')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Verification Queue
        </button>

        {/* Notifications */}
        {notice && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 fade-in">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <span>{notice}</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400 fade-in">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Top Header Card */}
        <Card className="overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-white">
                  {verification.student?.fullName || 'Student Candidate'}
                </h1>
                <Badge variant={statusConfig.variant} size="md" dot={verification.status === 'PENDING'}>
                  {statusConfig.label}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-400 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-500" />
                {verification.student?.email || 'No email provided'}
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5 text-slate-500" />
                  {verification.student?.college}
                </span>
                <span>{verification.student?.branch}</span>
                <span>{verification.student?.portfolioCompletion ?? 0}% portfolio complete</span>
                <span>
                  Submitted {formatDate(verification.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
            </div>

            {/* Target Type indicator banner */}
            <div className="rounded-xl border border-blue-500/25 bg-blue-500/10 px-4 py-3 text-sm text-blue-300 flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-blue-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400/80">Asset Under Review</p>
                <p className="font-extrabold text-white">{getVerificationTypeLabel(verification.targetType)}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Faculty Action Bar (Approve / Reject / Request Changes) */}
        {showActions && (
          <section className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-lg">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                  Faculty Verification Decision
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Review the evidence below and approve, reject, or request changes with actionable remarks.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => setActiveAction('approve')}
                >
                  Approve Verification
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setActiveAction('reject')}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setActiveAction('request-changes')}
                >
                  Request Changes
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Main Target Asset Section (Highlighted) */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800/70 pb-3">
            <ShieldCheck className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">
              Submitted Asset for Verification: <span className="text-blue-400">{getVerificationTypeLabel(targetType)}</span>
            </h2>
          </div>

          {/* PROJECT DETAIL */}
          {targetType === 'PROJECT' && (
            targetProject ? (
              <SectionCard title={targetProject.title} subtitle={targetProject.category || 'Project'}>
                <div className="space-y-6">
                  {/* Screenshots */}
                  {targetProject.screenshots?.length > 0 ? (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Project Screenshots</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {targetProject.screenshots.map((src, i) => (
                          <div key={i} className="aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                            <img src={src} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Descriptions */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Short Summary</p>
                      <p className="mt-1 text-sm text-slate-300 leading-relaxed">{targetProject.shortDescription}</p>
                    </div>
                    {targetProject.detailedDescription && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Detailed Description</p>
                        <p className="mt-1 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{targetProject.detailedDescription}</p>
                      </div>
                    )}
                  </div>

                  {/* Technologies */}
                  {targetProject.technologies?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Technologies</p>
                      <div className="flex flex-wrap gap-1.5">
                        {targetProject.technologies.map((tech) => (
                          <Badge key={tech} variant="blue" size="sm">{tech}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Links (GitHub, Live, Docs, Demo) */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Project Links & Evidence</p>
                    <div className="flex flex-wrap gap-3">
                      {targetProject.githubRepository && (
                        <a href={targetProject.githubRepository} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-white hover:border-blue-500/50 transition-colors">
                          <Github className="h-4 w-4" /> GitHub Repository
                        </a>
                      )}
                      {targetProject.liveDeployment && (
                        <a href={targetProject.liveDeployment} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:border-emerald-500 transition-colors">
                          <ExternalLink className="h-4 w-4" /> Live Deployment
                        </a>
                      )}
                      {targetProject.documentationUrl && (
                        <a href={targetProject.documentationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-white hover:border-blue-500/50 transition-colors">
                          <FileText className="h-4 w-4" /> Documentation
                        </a>
                      )}
                      {targetProject.demoVideo && (
                        <a href={targetProject.demoVideo} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-white hover:border-blue-500/50 transition-colors">
                          <ExternalLink className="h-4 w-4" /> Demo Video
                        </a>
                      )}
                      {!targetProject.githubRepository && !targetProject.liveDeployment && !targetProject.documentationUrl && !targetProject.demoVideo && (
                        <span className="text-xs text-slate-500 italic">No external URLs provided for this project.</span>
                      )}
                    </div>
                  </div>
                </div>
              </SectionCard>
            ) : <DetailEmptyState title="Project details unavailable" message="The submitted project record could not be loaded." icon={FolderKanban} />
          )}

          {/* CERTIFICATE DETAIL */}
          {targetType === 'CERTIFICATE' && (
            targetCertificate ? (
              <SectionCard title={targetCertificate.title} subtitle={targetCertificate.category || 'Certificate'}>
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Issuer</p>
                      <p className="mt-1 text-sm font-semibold text-white">{targetCertificate.issuer}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Issue Date</p>
                      <p className="mt-1 text-sm font-semibold text-white">{formatDate(targetCertificate.issueDate)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Credential ID</p>
                      <p className="mt-1 text-sm font-mono text-slate-300">{targetCertificate.credentialId || 'None provided'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</p>
                      <p className="mt-1 text-sm font-semibold text-white">{targetCertificate.category || 'General'}</p>
                    </div>
                  </div>

                  {/* Skills */}
                  {targetCertificate.skills?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Associated Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {targetCertificate.skills.map((skill) => (
                          <Badge key={skill} variant="blue" size="sm">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certificate file and URL */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {targetCertificate.certificateFile?.fileUrl && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={Eye}
                          onClick={() => {
                            setPreviewDocumentUrl(targetCertificate.certificateFile.fileUrl);
                            setPreviewDocumentTitle(`Certificate: ${targetCertificate.title}`);
                          }}
                        >
                          Preview Document
                        </Button>
                        <a href={targetCertificate.certificateFile.fileUrl} target="_blank" rel="noreferrer" download>
                          <Button size="sm" variant="outline" leftIcon={Download}>Download File</Button>
                        </a>
                      </>
                    )}
                    {targetCertificate.credentialUrl && (
                      <a href={targetCertificate.credentialUrl} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" leftIcon={ExternalLink}>Verify on Credential Issuer Link</Button>
                      </a>
                    )}
                  </div>
                </div>
              </SectionCard>
            ) : <DetailEmptyState title="Certificate details unavailable" message="The submitted certificate could not be loaded." icon={FileText} />
          )}

          {/* RESUME DETAIL */}
          {targetType === 'RESUME' && (
            targetResume ? (
              <SectionCard title="Resume Document" subtitle="Student's uploaded active resume PDF">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
                        <FileText className="h-6 w-6 text-red-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{targetResume.originalFileName}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Uploaded {formatDate(targetResume.uploadedAt || targetResume.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={Eye}
                        onClick={() => {
                          setPreviewDocumentUrl(targetResume.fileUrl);
                          setPreviewDocumentTitle(`Resume: ${targetResume.originalFileName}`);
                        }}
                      >
                        Inline Preview
                      </Button>
                      <a href={targetResume.fileUrl} download={targetResume.originalFileName} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" leftIcon={Download}>Download PDF</Button>
                      </a>
                    </div>
                  </div>

                  {/* Inline PDF iframe */}
                  {targetResume.fileUrl && (
                    <div className="h-[500px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                      <iframe src={targetResume.fileUrl} title="Resume Preview" className="w-full h-full border-0" />
                    </div>
                  )}
                </div>
              </SectionCard>
            ) : <DetailEmptyState title="No resume document found" message="The student has not uploaded a resume yet." icon={FileText} />
          )}

          {/* GITHUB DETAIL */}
          {targetType === 'GITHUB' && (
            targetGithub ? (
              <SectionCard title={`GitHub Profile: @${targetGithub.githubUsername}`} subtitle="Connected GitHub account snapshot">
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-700 bg-slate-800">
                      <Github className="h-7 w-7 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base font-bold text-white">@{targetGithub.githubUsername}</h4>
                      <p className="text-xs text-slate-400 mt-1">{targetGithub.bio || 'No GitHub bio provided'}</p>
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                        <span><strong>{targetGithub.publicRepos ?? 0}</strong> Public Repositories</span>
                        <span><strong>{targetGithub.followers ?? 0}</strong> Followers</span>
                        <span><strong>{targetGithub.following ?? 0}</strong> Following</span>
                      </div>
                    </div>
                    {targetGithub.githubProfileUrl && (
                      <a href={targetGithub.githubProfileUrl} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="primary" leftIcon={ExternalLink}>Open GitHub Profile</Button>
                      </a>
                    )}
                  </div>
                </div>
              </SectionCard>
            ) : <DetailEmptyState title="GitHub account not connected" message="The student has not connected a GitHub profile." icon={Github} />
          )}

          {/* PROFILE DETAIL */}
          {targetType === 'PROFILE' && (
            targetProfile ? (
              <SectionCard title="Student Academic Profile" subtitle="Detailed information submitted by student">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Full Name</p>
                    <p className="mt-1 text-sm font-semibold text-white">{targetProfile.fullName || verification.student?.fullName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">College / Institution</p>
                    <p className="mt-1 text-sm font-semibold text-white">{targetProfile.college || verification.student?.college}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Branch / Major</p>
                    <p className="mt-1 text-sm font-semibold text-white">{targetProfile.branch || verification.student?.branch}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current Year</p>
                    <p className="mt-1 text-sm font-semibold text-white">{targetProfile.currentYear ? `Year ${targetProfile.currentYear}` : 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">CGPA</p>
                    <p className="mt-1 text-sm font-semibold text-white">{targetProfile.cgpa ?? 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone</p>
                    <p className="mt-1 text-sm font-semibold text-white">{targetProfile.phone || 'Not provided'}</p>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Bio / About Me</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-300 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                      {targetProfile.bio || 'No bio provided'}
                    </p>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {targetProfile.skills?.length ? (
                        targetProfile.skills.map((skill) => (
                          <Badge key={skill} variant="blue" size="sm">{skill}</Badge>
                        ))
                      ) : <span className="text-xs text-slate-500">No skills listed</span>}
                    </div>
                  </div>
                </div>
              </SectionCard>
            ) : <DetailEmptyState title="Profile not completed" message="The student has not created a detailed profile yet." icon={UserRound} />
          )}
        </section>

        {/* Student Full Portfolio Context */}
        <section className="space-y-4 pt-4 border-t border-slate-800/80">
          <h2 className="text-base font-bold text-white">Full Student Portfolio Overview</h2>
          <div className="grid gap-6 xl:grid-cols-2">
            {/* Other Projects */}
            <SectionCard title="Projects" subtitle={`${portfolio.projects?.length || 0} project(s) total`}>
              {portfolio.projects?.length ? (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {portfolio.projects.map((p) => (
                    <div key={p._id} className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{p.title}</p>
                        <p className="text-[11px] text-slate-400 truncate">{p.shortDescription}</p>
                      </div>
                      <Badge variant="slate" size="xs">{p.category}</Badge>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-500">No other projects found.</p>}
            </SectionCard>

            {/* Other Certificates */}
            <SectionCard title="Certificates" subtitle={`${portfolio.certificates?.length || 0} certificate(s) total`}>
              {portfolio.certificates?.length ? (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {portfolio.certificates.map((c) => (
                    <div key={c._id} className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{c.title}</p>
                        <p className="text-[11px] text-slate-400">{c.issuer} · {formatDate(c.issueDate)}</p>
                      </div>
                      <Badge variant="blue" size="xs">{c.category || 'Certificate'}</Badge>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-500">No other certificates found.</p>}
            </SectionCard>
          </div>
        </section>

        {/* AI-Assisted Analysis (Advisory Only) */}
        <section className="space-y-4 pt-4 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-400" />
              <h2 className="text-base font-bold text-white">AI-Assisted Analysis</h2>
            </div>
            <Badge variant="purple" size="sm">Advisory Only — Decision Remains With Faculty</Badge>
          </div>

          <div className="rounded-xl border border-purple-500/20 bg-purple-950/10 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-slate-300">
                <p className="font-semibold text-white">Automated Evidence Synthesis</p>
                <p className="text-slate-400 leading-relaxed">
                  This advisory evaluation synthesizes verified project technologies, documentation, complexity signals, and code quality indicators. It is provided to support faculty review; faculty verification remains the authoritative decision.
                </p>
              </div>
            </div>

            {aiInsight?.evaluation ? (
              <div className="space-y-4 pt-3 border-t border-purple-500/20">
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 block">Overall Portfolio Score</span>
                    <span className="text-xl font-extrabold text-white">
                      {Math.round(aiInsight.evaluation.overallScore)}/100
                    </span>
                    <span className="ml-2 text-xs text-purple-300">({aiInsight.evaluation.category})</span>
                  </div>
                  {aiInsight.readiness?.readiness_score !== undefined && (
                    <div>
                      <span className="text-xs text-slate-400 block">Industry Readiness</span>
                      <span className="text-xl font-extrabold text-emerald-400">
                        {Math.round(aiInsight.readiness.readiness_score)}/100
                      </span>
                    </div>
                  )}
                </div>

                {aiInsight.evaluation.componentScores && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                    {Object.entries(aiInsight.evaluation.componentScores).map(([key, score]) => (
                      <div key={key} className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 block capitalize truncate">{key.replace('_', ' ')}</span>
                        <span className="font-bold text-white font-mono">{score !== null ? `${Math.round(score)}` : '—'}</span>
                      </div>
                    ))}
                  </div>
                )}

                {Array.isArray(aiInsight.evaluation.strengths) && aiInsight.evaluation.strengths.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-300 mb-1">Key Strengths Detected:</p>
                    <ul className="text-xs text-slate-400 space-y-0.5 pl-4 list-disc">
                      {aiInsight.evaluation.strengths.slice(0, 3).map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No automated AI evaluation has been run for this student yet. Complete faculty verification to establish authoritative portfolio records.
              </p>
            )}
          </div>
        </section>

        {/* Verification History Audit Log */}
        <VerificationHistory history={history} studentName={verification.student?.fullName} />
      </div>

      {/* Decision Action Modal */}
      <VerificationActionModal
        open={Boolean(activeAction)}
        action={activeAction}
        verification={verification}
        onClose={() => setActiveAction(null)}
        onConfirm={handleDecision}
        loading={submitting}
      />

      {/* Document Preview Modal */}
      {previewDocumentUrl && (
        <Modal
          open={Boolean(previewDocumentUrl)}
          onClose={() => setPreviewDocumentUrl(null)}
          title={previewDocumentTitle || 'Document Preview'}
          size="lg"
        >
          <div className="w-full h-[70vh] rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
            <iframe src={previewDocumentUrl} title="Document Preview" className="w-full h-full border-0" />
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
};

export default VerificationDetail;
