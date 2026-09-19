/**
 * Resume.jsx — VidyaLink Student Resume Builder
 * ─────────────────────────────────────────────────────────────
 * Supports:
 *  1. Upload an existing PDF (manual)
 *  2. Generate an ATS-safe PDF from real profile data
 *  3. View ATS analysis with score breakdown
 *  4. Stale detection: "Profile changed since last generation"
 *  5. Download / Preview
 *
 * Product truth invariants:
 *  - No fake scores, names, or data
 *  - All ATS results come from the Node → FastAPI pipeline
 *  - Stale status reflects real profile snapshot diffs
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  UploadCloud, FileText, Trash2, RefreshCw, Download, Eye,
  CheckCircle2, AlertCircle, Sparkles, FileCheck, Calendar,
  HardDrive, ChevronDown, ChevronUp, Brain, Zap,
  Loader2, Info, AlertTriangle, TrendingUp, ShieldCheck,
} from 'lucide-react';

import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Spinner, { FullPageSpinner } from '@/components/ui/Spinner';
import {
  getResume, uploadResume, replaceResume, deleteResume,
  generateResume, getLatestResume, checkStaleness,
  getResumeComparison, importToProfile, reanalyzeATS,
} from '@/services/resumeService';
import { getErrorMessage, formatDate } from '@/utils/formatters';

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const SECTIONS = [
  { id: 'contact',         label: 'Contact',         desc: 'Name, email, phone, links' },
  { id: 'summary',         label: 'Summary',         desc: 'Professional bio / headline' },
  { id: 'skills',          label: 'Skills',          desc: 'Technical skills from profile and certificates' },
  { id: 'education',       label: 'Education',       desc: 'Degree, institution, graduation year, CGPA' },
  { id: 'projects',        label: 'Projects',        desc: 'Faculty-verified and owned projects' },
  { id: 'certifications',  label: 'Certifications',  desc: 'Verified certificates only' },
  { id: 'github',          label: 'GitHub',          desc: 'Connected GitHub account stats' },
];

const STATUS_COLORS = {
  UPLOADED:  { bg: 'bg-blue-500/10 border-blue-500/20',    text: 'text-blue-400',    label: 'Uploaded' },
  GENERATED: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', label: 'Generated' },
  STALE:     { bg: 'bg-amber-500/10 border-amber-500/20',  text: 'text-amber-400',   label: 'Stale' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const resumeSchema = z.object({
  resumeFile: z
    .any()
    .refine((f) => f && f.length > 0, 'Please select a PDF or DOCX file')
    .refine(
      (f) => {
        const file = f?.[0];
        if (!file) return false;
        const name = (file.name || '').toLowerCase();
        const type = file.type || '';
        return (
          name.endsWith('.pdf') ||
          name.endsWith('.docx') ||
          type === 'application/pdf' ||
          type.includes('wordprocessingml')
        );
      },
      'Only PDF and DOCX files are allowed'
    )
    .refine((f) => f?.[0]?.size <= MAX_FILE_SIZE, 'File size must not exceed 5 MB'),
});

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const scoreColor = (score) => {
  if (score == null) return 'text-slate-400';
  if (score >= 80)   return 'text-emerald-400';
  if (score >= 60)   return 'text-amber-400';
  return 'text-red-400';
};

const scoreBg = (score) => {
  if (score == null) return 'bg-slate-800/60 border-slate-700/60';
  if (score >= 80)   return 'bg-emerald-500/10 border-emerald-500/25';
  if (score >= 60)   return 'bg-amber-500/10 border-amber-500/25';
  return 'bg-red-500/10 border-red-500/25';
};

const unwrapData = (res) => res?.data?.data ?? res?.data ?? res;

// ── Sub-components ───────────────────────────────────────────────────────────

const ScorePill = ({ label, value }) => (
  <div className={`flex flex-col items-center justify-center rounded-lg border p-3 ${scoreBg(value)}`}>
    <span className={`text-lg font-extrabold tabular-nums ${scoreColor(value)}`}>
      {value != null ? Math.round(value) : '—'}
    </span>
    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mt-0.5 text-center leading-tight">
      {label}
    </span>
  </div>
);

const ATSPanel = ({ atsResult }) => {
  if (!atsResult) {
    return (
      <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-6 text-center space-y-2">
        <Brain className="w-8 h-8 text-slate-600 mx-auto" />
        <p className="text-xs font-bold text-slate-300">No ATS Analysis Yet</p>
        <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
          Generate a resume to automatically run ATS analysis, or upload a resume and use the ATS Analysis tab.
        </p>
      </div>
    );
  }

  const {
    ats_score, keyword_match_score, skills_score, education_score,
    experience_score, formatting_score, section_completeness,
    missing_keywords, detected_skills, suggestions,
  } = atsResult;

  return (
    <div className="space-y-5">
      {/* Main score */}
      <div className={`flex items-center gap-5 rounded-xl border p-5 ${scoreBg(ats_score)}`}>
        <div className={`text-5xl font-extrabold tabular-nums leading-none ${scoreColor(ats_score)}`}>
          {ats_score != null ? Math.round(ats_score) : '—'}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">ATS Score</p>
          <p className="text-sm font-bold text-slate-100 mt-0.5">
            {ats_score >= 80 ? 'Strong ATS Compatibility'
              : ats_score >= 60 ? 'Moderate ATS Compatibility'
              : ats_score != null ? 'Needs Improvement'
              : 'No score available'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Based on your resume content and structure
          </p>
        </div>
      </div>

      {/* Sub-scores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <ScorePill label="Keyword Match" value={keyword_match_score} />
        <ScorePill label="Skills"        value={skills_score} />
        <ScorePill label="Education"     value={education_score} />
        <ScorePill label="Experience"    value={experience_score} />
        {formatting_score != null && <ScorePill label="Formatting"   value={formatting_score} />}
      </div>

      {/* Section completeness */}
      {section_completeness && Object.keys(section_completeness).length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Section Completeness</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(section_completeness).map(([section, present]) => (
              <span
                key={section}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded border capitalize ${
                  present
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-500'
                }`}
              >
                {present ? '✓' : '○'} {section}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Detected skills */}
      {detected_skills?.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Detected Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {detected_skills.slice(0, 16).map((skill) => (
              <span key={skill} className="text-[11px] font-medium bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded px-2 py-0.5">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missing keywords */}
      {missing_keywords?.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Missing Keywords</p>
          <div className="flex flex-wrap gap-1.5">
            {missing_keywords.slice(0, 12).map((kw) => (
              <span key={kw} className="text-[11px] font-medium bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded px-2 py-0.5">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions?.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Suggestions</p>
          <ul className="space-y-2">
            {suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                <span className="mt-0.5 text-orange-400 flex-shrink-0">→</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const Resume = () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [resume,         setResume]         = useState(null);
  const [atsResult,      setAtsResult]      = useState(null);
  const [parsedData,     setParsedData]     = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [uploading,      setUploading]      = useState(false);
  const [uploadStep,     setUploadStep]     = useState(0); // 1..5
  const [generating,     setGenerating]     = useState(false);
  const [dragActive,     setDragActive]     = useState(false);
  const [selectedFile,   setSelectedFile]   = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedImportSkills, setSelectedImportSkills] = useState([]);
  const [selectedImportEdu, setSelectedImportEdu] = useState(true);
  const [importing, setImporting] = useState(false);
  const [atsJobDescription, setAtsJobDescription] = useState('');
  const [reanalyzingATS, setReanalyzingATS] = useState(false);
  const [actionError,    setActionError]    = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab,      setActiveTab]      = useState('status'); // 'status' | 'generate' | 'ats' | 'upload'
  const [jobDescription, setJobDescription] = useState('');
  const [sections, setSections]             = useState(
    Object.fromEntries(SECTIONS.map((s) => [s.id, true]))
  );
  const [showJDInput,    setShowJDInput]    = useState(false);

  const fileInputRef = useRef(null);

  const { handleSubmit, setValue, reset, formState: { errors } } = useForm({
    resolver: zodResolver(resumeSchema),
  });

  // ── Data fetch ─────────────────────────────────────────────────────────────
  const fetchLatest = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getLatestResume();
      const payload = unwrapData(res);
      if (payload) {
        setResume(payload.resume || null);
        setAtsResult(payload.atsResult || null);
        setParsedData(payload.parsedData || payload.resume?.parsedData || null);
        // If we have a generated resume, silently check staleness
        if (payload.resume?.resumeSource === 'generated') {
          try {
            const staleRes = await checkStaleness();
            const stalePayload = unwrapData(staleRes);
            if (stalePayload?.resume) setResume(stalePayload.resume);
          } catch { /* Non-critical */ }
        }
      }
    } catch {
      // On error, try the basic getResume
      try {
        const res = await getResume();
        const fallbackPayload = unwrapData(res);
        setResume(fallbackPayload);
        setParsedData(fallbackPayload?.parsedData || null);
      } catch { /* Ignore */ }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLatest(); }, [fetchLatest]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const showSuccess = (msg) => { setSuccessMessage(msg); setActionError(''); setTimeout(() => setSuccessMessage(''), 5000); };
  const showError   = (msg) => { setActionError(msg); setSuccessMessage(''); };

  // ── Upload handlers ────────────────────────────────────────────────────────
  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const validateAndSetFile = (file) => {
    showError('');
    if (!file) return;
    const name = (file.name || '').toLowerCase();
    const type = file.type || '';
    const isPdf = name.endsWith('.pdf') || type === 'application/pdf';
    const isDocx = name.endsWith('.docx') || type.includes('wordprocessingml');
    if (!isPdf && !isDocx) {
      showError('Only PDF and DOCX files are allowed'); return;
    }
    if (file.size > MAX_FILE_SIZE) { showError('File size must not exceed 5 MB'); return; }
    setSelectedFile(file);
    const dt = new DataTransfer();
    dt.items.add(file);
    setValue('resumeFile', dt.files, { shouldValidate: true });
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) validateAndSetFile(e.dataTransfer.files[0]);
  };

  const onSubmit = async () => {
    if (!selectedFile) return;
    try {
      setUploading(true); showError('');
      setUploadStep(1); // Step 1: Uploading...

      const stepTimer1 = setTimeout(() => setUploadStep(2), 600); // Step 2: Reading resume...
      const stepTimer2 = setTimeout(() => setUploadStep(3), 1200); // Step 3: Extracting information...
      const stepTimer3 = setTimeout(() => setUploadStep(4), 1800); // Step 4: Analyzing ATS compatibility...

      const response = resume ? await replaceResume(selectedFile) : await uploadResume(selectedFile);
      clearTimeout(stepTimer1); clearTimeout(stepTimer2); clearTimeout(stepTimer3);
      setUploadStep(5); // Step 5: Complete

      const payload = unwrapData(response);
      const resDoc = payload?.resume || payload;
      setResume(resDoc);
      setAtsResult(payload?.atsResult || null);
      setParsedData(payload?.parsedData || resDoc?.parsedData || null);
      setSelectedFile(null); reset();
      if (fileInputRef.current) fileInputRef.current.value = '';
      showSuccess(payload?.isDuplicate ? 'Duplicate resume detected — existing parsed data reused' : 'Resume uploaded, parsed, and analyzed successfully!');
      setActiveTab('status');
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to upload resume'));
    } finally {
      setUploading(false);
      setUploadStep(0);
    }
  };

  const handleOpenComparison = async () => {
    try {
      setComparisonLoading(true);
      setComparisonModalOpen(true);
      const res = await getResumeComparison();
      const payload = unwrapData(res);
      setComparisonData(payload);
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to load resume comparison'));
    } finally {
      setComparisonLoading(false);
    }
  };

  const handleOpenImport = () => {
    const rawSkills = parsedData?.skills || [];
    setSelectedImportSkills(rawSkills.map((s) => s.value));
    setSelectedImportEdu(Boolean(parsedData?.education?.length));
    setImportModalOpen(true);
  };

  const handleConfirmImport = async () => {
    try {
      setImporting(true);
      const payload = {
        skills: selectedImportSkills,
        education: selectedImportEdu && parsedData?.education?.[0] ? {
          college: parsedData.education[0].institution,
          degree: parsedData.education[0].degree,
          branch: parsedData.education[0].field,
        } : null,
      };
      await importToProfile(payload);
      showSuccess('Selected resume information imported to profile successfully!');
      setImportModalOpen(false);
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to import to profile'));
    } finally {
      setImporting(false);
    }
  };

  const handleReanalyzeATS = async () => {
    try {
      setReanalyzingATS(true); showError('');
      const res = await reanalyzeATS(atsJobDescription.trim() || null);
      const payload = unwrapData(res);
      if (payload?.atsResult) {
        setAtsResult(payload.atsResult);
        showSuccess('ATS re-analysis completed with your job description!');
      }
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to run ATS analysis'));
    } finally {
      setReanalyzingATS(false);
    }
  };

  // ── Generate handler ───────────────────────────────────────────────────────
  const handleGenerate = async () => {
    try {
      setGenerating(true); showError('');
      const response = await generateResume({
        jobDescription: jobDescription.trim() || null,
        sections,
      });
      const payload = unwrapData(response);
      if (payload?.resume) setResume(payload.resume);
      if (payload?.atsResult) { setAtsResult(payload.atsResult); setActiveTab('ats'); }
      else setActiveTab('status');
      showSuccess('Resume generated successfully!');
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to generate resume'));
    } finally {
      setGenerating(false);
    }
  };

  // ── Delete handler ─────────────────────────────────────────────────────────
  const handleDelete = async () => {
    try {
      setUploading(true);
      await deleteResume();
      setResume(null); setAtsResult(null); setSelectedFile(null);
      setDeleteModalOpen(false); reset();
      if (fileInputRef.current) fileInputRef.current.value = '';
      showSuccess('Resume deleted successfully');
      setActiveTab('generate');
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to delete resume'));
    } finally {
      setUploading(false);
    }
  };

  // ── Status helpers ─────────────────────────────────────────────────────────
  const status      = resume?.status || null;
  const statusStyle = STATUS_COLORS[status] || STATUS_COLORS.UPLOADED;
  const isStale     = status === 'STALE';

  if (loading) return <FullPageSpinner message="Loading resume details…" />;

  // ── TABS ───────────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'status',   label: 'Overview',     icon: FileCheck },
    { id: 'generate', label: 'Generate',      icon: Sparkles },
    { id: 'ats',      label: 'ATS Analysis',  icon: Brain },
    { id: 'upload',   label: 'Upload PDF',    icon: UploadCloud },
  ];

  return (
    <DashboardLayout>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title text-white flex items-center gap-2">
            Resume Builder
            {resume && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${statusStyle.bg} ${statusStyle.text}`}>
                {statusStyle.label}
              </span>
            )}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Generate an ATS-safe resume from your profile, or upload your own PDF.
          </p>
        </div>
        {resume && (
          <a href={resume.fileUrl} download={resume.originalFileName} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="sm" leftIcon={Download}>Download</Button>
          </a>
        )}
      </div>

      {/* Banners */}
      {isStale && (
        <div className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Profile changed since last generation.</span>
            {' '}Your resume may not reflect current skills, projects, or certificates.
          </div>
          <Button variant="secondary" size="sm" leftIcon={RefreshCw} onClick={() => setActiveTab('generate')}>
            Regenerate
          </Button>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {actionError && (
        <div className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-slate-800/80 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all duration-150 ${
              activeTab === id
                ? 'border-orange-300 text-orange-300'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ────────────────────────────────────────────────── */}
      {activeTab === 'status' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {resume ? (
              <SectionCard
                title="Current Resume"
                subtitle={resume.resumeSource === 'generated' ? 'Generated from your profile data' : 'Manually uploaded PDF'}
                action={
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" leftIcon={Eye} onClick={() => setPreviewModalOpen(true)}>Preview</Button>
                    <Button variant="danger" size="sm" leftIcon={Trash2} onClick={() => setDeleteModalOpen(true)}>Delete</Button>
                  </div>
                }
              >
                <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-4">
                  <div className="flex items-start gap-4 flex-wrap justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white break-all">{resume.originalFileName}</h3>
                        <div className="flex items-center flex-wrap gap-4 text-xs text-slate-400 mt-2">
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                            {formatFileSize(resume.fileSize)}
                          </span>
                          {resume.resumeSource === 'generated' && resume.generatedAt && (
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                              Generated {formatDate(resume.generatedAt)}
                            </span>
                          )}
                          {resume.resumeSource === 'uploaded' && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              Uploaded {formatDate(resume.uploadedAt || resume.createdAt)}
                            </span>
                          )}
                        </div>
                        {resume.generationVersion && (
                          <span className="inline-block text-[10px] text-slate-600 mt-1 font-mono">
                            Template v{resume.generationVersion}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ATS quick summary */}
                {atsResult && (
                  <div className={`mt-4 flex items-center gap-4 rounded-xl border p-4 ${scoreBg(atsResult.ats_score)}`}>
                    <div className={`text-3xl font-extrabold tabular-nums ${scoreColor(atsResult.ats_score)}`}>
                      {Math.round(atsResult.ats_score)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">ATS Score</p>
                      <p className="text-sm font-bold text-slate-100">Keyword Match: {Math.round(atsResult.keyword_match_score)} · Skills: {Math.round(atsResult.skills_score)}</p>
                    </div>
                    <Button variant="secondary" size="sm" leftIcon={TrendingUp} onClick={() => setActiveTab('ats')}>
                      Details
                    </Button>
                  </div>
                )}

                {!atsResult && (
                  <div className="mt-4 rounded-xl border border-slate-800/60 bg-slate-950/40 p-4 flex items-center gap-3">
                    <Info className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <p className="text-xs text-slate-500">No ATS analysis yet. Generate a resume or run ATS from the ATS tab.</p>
                  </div>
                )}

                {/* Scanned / Image-only warning */}
                {resume.parsingStatus === 'IMAGE_ONLY' && (
                  <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      Text could not be extracted from this document.
                    </p>
                    <p className="text-slate-400">
                      This document appears to be a scanned image or non-selectable PDF. Upload a machine-readable PDF or DOCX to unlock ATS scoring and structured intelligence.
                    </p>
                  </div>
                )}

                {/* Empty document warning */}
                {resume.parsingStatus === 'EMPTY' && (
                  <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      Document contains no text.
                    </p>
                    <p className="text-slate-400">
                      The uploaded file has no readable text. Please check the document and upload a valid resume.
                    </p>
                  </div>
                )}

                {/* Parsed Resume Intelligence Card */}
                {parsedData && (
                  <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-orange-300" />
                          Resume Information Detected
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Structured evidence parsed from your uploaded document
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={ShieldCheck}
                          onClick={handleOpenComparison}
                        >
                          Review Consistency
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          leftIcon={Sparkles}
                          onClick={handleOpenImport}
                        >
                          Import to Profile
                        </Button>
                      </div>
                    </div>

                    {/* Detected Skills */}
                    {parsedData.skills?.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          Detected Skills ({parsedData.skills.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {parsedData.skills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-900 border border-slate-800 text-slate-200 px-2 py-0.5 rounded-md"
                            >
                              {skill.value}
                              <span className="text-[9px] text-slate-500 font-mono">resume</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Detected Education */}
                    {parsedData.education?.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          Education Detected
                        </p>
                        <div className="space-y-2">
                          {parsedData.education.map((edu, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-0.5">
                              <p className="font-bold text-white">{edu.institution}</p>
                              {(edu.degree || edu.field) && (
                                <p className="text-slate-400">{[edu.degree, edu.field].filter(Boolean).join(' in ')}</p>
                              )}
                              {(edu.dates || edu.cgpa) && (
                                <p className="text-[11px] text-slate-500">{[edu.dates, edu.cgpa].filter(Boolean).join(' • ')}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Detected Experience */}
                    {parsedData.experience?.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          Experience Detected ({parsedData.experience.length})
                        </p>
                        <div className="space-y-2">
                          {parsedData.experience.map((exp, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-0.5">
                              <div className="flex items-center justify-between">
                                <p className="font-bold text-white">{exp.role}</p>
                                {exp.duration && <span className="text-[10px] text-slate-500">{exp.duration}</span>}
                              </div>
                              <p className="text-slate-400">{exp.company}</p>
                              {exp.description && (
                                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{exp.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Detected Projects */}
                    {parsedData.projects?.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          Projects Detected ({parsedData.projects.length})
                        </p>
                        <div className="space-y-2">
                          {parsedData.projects.map((proj, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-1">
                              <p className="font-bold text-white">{proj.title}</p>
                              {proj.description && (
                                <p className="text-[11px] text-slate-400 line-clamp-2">{proj.description}</p>
                              )}
                              {proj.technologies?.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {proj.technologies.map((t) => (
                                    <span key={t} className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </SectionCard>
            ) : (
              <SectionCard title="No Resume Yet">
                <div className="text-center space-y-4 py-6">
                  <FileText className="w-10 h-10 text-slate-600 mx-auto" />
                  <div>
                    <p className="text-sm font-bold text-white">No stored document</p>
                    <p className="text-xs text-slate-400 mt-1">Generate a resume from your profile, or upload an existing PDF.</p>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <Button size="sm" variant="primary" leftIcon={Sparkles} onClick={() => setActiveTab('generate')}>
                      Generate from Profile
                    </Button>
                    <Button size="sm" variant="secondary" leftIcon={UploadCloud} onClick={() => setActiveTab('upload')}>
                      Upload PDF
                    </Button>
                  </div>
                </div>
              </SectionCard>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <SectionCard title="Resume Tips">
              <div className="space-y-4 text-xs text-slate-300">
                {[
                  { n: 1, title: 'Use Standard Sections',     body: 'ATS parsers look for headings like Skills, Education, and Projects. The generator uses these exactly.' },
                  { n: 2, title: 'Add Real Skills',            body: 'Skills on your profile and in certificate records are extracted automatically.' },
                  { n: 3, title: 'Connect GitHub',             body: 'A connected GitHub account adds verified activity data to your resume.' },
                  { n: 4, title: 'Verify Certificates',        body: 'Only faculty-verified certificates appear in the generated resume.' },
                ].map(({ n, title, body }) => (
                  <div key={n} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-orange-300/10 text-orange-300 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{n}</div>
                    <div>
                      <p className="font-bold text-white mb-0.5">{title}</p>
                      <p className="text-slate-400 leading-relaxed">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── GENERATE TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SectionCard
              title="Generate ATS Resume"
              subtitle="Creates a machine-readable PDF from your real profile data. Only sections with content are included."
            >
              {/* Section toggles */}
              <div className="space-y-3 mb-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Include Sections</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SECTIONS.map(({ id, label, desc }) => (
                    <label
                      key={id}
                      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all duration-150 ${
                        sections[id]
                          ? 'border-orange-300/40 bg-orange-300/5'
                          : 'border-slate-800/60 bg-slate-950/30 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={sections[id]}
                        onChange={(e) => setSections((prev) => ({ ...prev, [id]: e.target.checked }))}
                        className="mt-0.5 w-3.5 h-3.5 accent-orange-400 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-200">{label}</p>
                        <p className="text-[11px] text-slate-500">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Optional job description */}
              <div className="mb-5">
                <button
                  type="button"
                  onClick={() => setShowJDInput((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showJDInput ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showJDInput ? 'Hide' : 'Add'} Job Description (optional — improves ATS keyword matching)
                </button>
                {showJDInput && (
                  <div className="mt-3">
                    <textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      rows={6}
                      placeholder="Paste a real job description here to compare your resume against specific requirements. Leave blank for general ATS analysis."
                      className="w-full rounded-lg border border-slate-700/80 bg-slate-950/60 px-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-orange-300/60 resize-y"
                      maxLength={50000}
                    />
                    <p className="text-[10px] text-slate-600 mt-1">{jobDescription.length}/50 000 chars</p>
                  </div>
                )}
              </div>

              {/* Generate button */}
              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={generating ? Loader2 : Zap}
                  onClick={handleGenerate}
                  disabled={generating}
                  loading={generating}
                >
                  {generating ? 'Generating…' : resume ? 'Regenerate Resume' : 'Generate Resume'}
                </Button>
                {resume && (
                  <span className="text-[11px] text-slate-500">
                    Will replace current resume file
                  </span>
                )}
              </div>

              <div className="mt-4 p-3 rounded-lg bg-slate-900/60 border border-slate-800/60">
                <div className="flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Only verified certificates and real profile data are used. Sections with no content are omitted automatically. ATS analysis runs immediately after generation.
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard title="ATS-Safe Design">
              <div className="space-y-3 text-xs text-slate-400">
                {[
                  'Single-column layout',
                  'Standard section headings',
                  'Selectable text (not image)',
                  'No decorative graphics or icons',
                  'No skill progress bars',
                  'Machine-readable fonts',
                  'Standard A4 page size',
                ].map((point) => (
                  <div key={point} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    {point}
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── ATS ANALYSIS TAB ──────────────────────────────────────────────── */}
      {activeTab === 'ats' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SectionCard
              title="ATS Analysis"
              subtitle="Evidence-based scoring of your resume content and structure"
              action={
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-1">
                  <Brain className="w-3 h-3" /> Real Data Only
                </span>
              }
            >
              {resume && (
                <div className="mb-4 flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs flex-wrap gap-2">
                  <span className="text-slate-400">
                    Analyzed Document: <strong className="text-white">{resume.originalFileName}</strong> ({resume.fileType?.toUpperCase() || 'PDF'}, Version {resume.version || 1})
                  </span>
                  {atsResult?.formatting_score != null && (
                    <span className="text-emerald-400 font-medium text-[11px]">Selectable Text Detected</span>
                  )}
                </div>
              )}
              <ATSPanel atsResult={atsResult} />

              {/* Optional Job Description Matcher */}
              {resume && resume.rawText && (
                <div className="mt-6 pt-5 border-t border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Target Job Description Match
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Paste a specific job description to test keyword coverage against your uploaded resume.
                  </p>
                  <textarea
                    value={atsJobDescription}
                    onChange={(e) => setAtsJobDescription(e.target.value)}
                    rows={4}
                    placeholder="Paste job description requirements, qualifications, and skills here..."
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-orange-300/60"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="secondary"
                      leftIcon={Brain}
                      loading={reanalyzingATS}
                      disabled={reanalyzingATS || !atsJobDescription.trim()}
                      onClick={handleReanalyzeATS}
                    >
                      Analyze Against Job Description
                    </Button>
                  </div>
                </div>
              )}
            </SectionCard>
          </div>
          <div className="space-y-6">
            <SectionCard title="How ATS Scoring Works">
              <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
                <p>
                  ATS (Applicant Tracking System) analysis checks your resume for structural completeness,
                  detected technical skills, and — if a job description is provided — keyword alignment.
                </p>
                <p>All scores are deterministic and based solely on your actual resume text.</p>
                <div className="space-y-2 pt-1">
                  {[
                    { label: 'Keyword Match', desc: 'JD keyword coverage (0 if no JD provided)' },
                    { label: 'Skills',        desc: 'Recognised technical vocabulary' },
                    { label: 'Education',     desc: 'Education section presence and completeness' },
                    { label: 'Experience',    desc: 'Work/internship evidence detected' },
                    { label: 'Formatting',    desc: 'Bullet structure, line length, document size' },
                  ].map(({ label, desc }) => (
                    <div key={label}>
                      <span className="font-bold text-slate-300">{label}:</span> {desc}
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── UPLOAD TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Existing resume card */}
            {resume && (
              <SectionCard title="Active Resume" subtitle="Currently uploaded or generated file">
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center gap-4 justify-between flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white break-all">{resume.originalFileName}</p>
                      <p className="text-xs text-slate-400">{formatFileSize(resume.fileSize)} · Version {resume.version || 1}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${statusStyle.bg} ${statusStyle.text}`}>
                    {statusStyle.label}
                  </span>
                </div>
              </SectionCard>
            )}

            {/* Upload form */}
            <SectionCard
              title={resume ? 'Replace with New Document' : 'Upload Resume Document'}
              subtitle="Drag & drop or browse — PDF or DOCX, max 5 MB"
            >
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div
                  onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[200px] ${
                    dragActive
                      ? 'border-orange-300 bg-orange-300/10'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-900/60'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => e.target.files?.[0] && validateAndSetFile(e.target.files[0])}
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-lg bg-orange-300/10 border border-orange-300/20 flex items-center justify-center mb-4">
                    <UploadCloud className="w-7 h-7 text-orange-300" />
                  </div>
                  {selectedFile ? (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-orange-300 flex items-center justify-center gap-1.5">
                        <FileText className="w-4 h-4" /> {selectedFile.name}
                      </p>
                      <p className="text-xs text-slate-400">Size: {formatFileSize(selectedFile.size)}</p>
                      <span className="inline-block text-[11px] text-emerald-400 font-semibold mt-1">Ready to upload</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-200 mb-1">
                        Drag & drop PDF or DOCX, or <span className="text-orange-300 underline">browse</span>
                      </p>
                      <p className="text-xs text-slate-500">PDF or DOCX format (Max 5 MB)</p>
                    </>
                  )}
                </div>

                {errors.resumeFile && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {errors.resumeFile.message}
                  </p>
                )}
                {uploading && (
                  <div className="space-y-3 py-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-orange-300 flex items-center gap-2">
                        <Spinner size="sm" />
                        {uploadStep === 1 && 'Step 1 of 5: Uploading file...'}
                        {uploadStep === 2 && 'Step 2 of 5: Reading resume (PDF/DOCX)...'}
                        {uploadStep === 3 && 'Step 3 of 5: Extracting structured information...'}
                        {uploadStep === 4 && 'Step 4 of 5: Analyzing ATS compatibility...'}
                        {uploadStep === 5 && 'Step 5 of 5: Processing complete!'}
                        {uploadStep === 0 && 'Processing resume...'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {uploadStep > 0 ? `${uploadStep * 20}%` : 'Please wait'}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-400 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(uploadStep * 20, 10)}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-1">
                  {selectedFile && (
                    <Button type="button" variant="ghost" size="md" onClick={() => { setSelectedFile(null); reset(); if (fileInputRef.current) fileInputRef.current.value = ''; }} disabled={uploading}>
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" variant="primary" size="md" disabled={!selectedFile || uploading} loading={uploading} leftIcon={resume ? RefreshCw : UploadCloud}>
                    {resume ? 'Replace Resume' : 'Upload Resume'}
                  </Button>
                </div>
              </form>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard title="Upload Requirements">
              <div className="space-y-4 text-xs text-slate-300">
                {[
                  { n: 1, title: 'PDF & DOCX Formats', body: 'Standard .pdf and .docx documents are accepted.' },
                  { n: 2, title: '5 MB Limit', body: 'Keep below 5 MB for fast extraction and parsing.' },
                  { n: 3, title: 'Selectable Text', body: 'Ensure your document contains actual text, not scanned bitmap images.' },
                ].map(({ n, title, body }) => (
                  <div key={n} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-orange-300/10 text-orange-300 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{n}</div>
                    <div>
                      <p className="font-bold text-white mb-0.5">{title}</p>
                      <p className="text-slate-400">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── Preview Modal ─────────────────────────────────────────────────── */}
      {resume && (
        <Modal open={previewModalOpen} onClose={() => setPreviewModalOpen(false)} title={`Preview: ${resume.originalFileName}`} size="lg">
          <div className="w-full h-[65vh] rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
            <iframe src={resume.fileUrl} title="Resume Preview" className="w-full h-full border-0" />
          </div>
        </Modal>
      )}

      {/* ── Delete Modal ──────────────────────────────────────────────────── */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Resume Deletion"
        size="sm"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={uploading} onClick={handleDelete}>Delete Permanently</Button>
          </div>
        }
      >
        <div className="flex items-center gap-3 text-slate-300 text-sm">
          <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
          <p>Are you sure you want to delete your active resume? This action cannot be undone.</p>
        </div>
      </Modal>

      {/* ── Comparison Modal ────────────────────────────────────────────── */}
      <Modal
        open={comparisonModalOpen}
        onClose={() => setComparisonModalOpen(false)}
        title="Resume vs Profile & Portfolio Consistency"
        size="lg"
      >
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1 text-xs text-slate-300">
          {comparisonLoading && (
            <div className="py-12 text-center space-y-2">
              <Spinner size="md" />
              <p className="text-slate-400">Comparing resume claims against verified records...</p>
            </div>
          )}

          {!comparisonLoading && comparisonData && (
            <div className="space-y-6">
              {/* Conflicts banner if any */}
              {comparisonData.profileComparison?.conflicts?.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                  <p className="font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Differences Detected Between Resume and Profile
                  </p>
                  <div className="space-y-1 pl-5">
                    {comparisonData.profileComparison.conflicts.map((c, i) => (
                      <p key={i} className="text-amber-200">
                        • {c.message} (Resume: &quot;{c.resumeValue}&quot; vs Profile: &quot;{c.profileValue}&quot;)
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills Comparison */}
              <div className="space-y-2">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                  Skills Consistency
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                    <p className="font-semibold text-emerald-400">
                      Matched Skills ({comparisonData.profileComparison?.matchedSkills?.length || 0})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {comparisonData.profileComparison?.matchedSkills?.length ? (
                        comparisonData.profileComparison.matchedSkills.map((s) => (
                          <span key={s} className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px]">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500">No overlapping skills</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                    <p className="font-semibold text-blue-400">
                      Resume-Only Skills ({comparisonData.profileComparison?.resumeOnlySkills?.length || 0})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {comparisonData.profileComparison?.resumeOnlySkills?.length ? (
                        comparisonData.profileComparison.resumeOnlySkills.map((s) => (
                          <span key={s} className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px]">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500">No unlisted skills</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Projects Comparison */}
              <div className="space-y-2">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                  Projects & Portfolio Verification
                </h4>
                <div className="space-y-2">
                  {comparisonData.portfolioComparison?.projectsComparison?.length ? (
                    comparisonData.portfolioComparison.projectsComparison.map((p, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                        <span className="font-bold text-white truncate">{p.title}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap ${
                          p.status === 'MATCHED' && p.verified
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                            : p.status === 'MATCHED'
                            ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}>
                          {p.label}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500">No projects found in resume</p>
                  )}
                </div>
              </div>

              {/* Certificates Comparison */}
              <div className="space-y-2">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                  Certificates Verification
                </h4>
                <div className="space-y-2">
                  {comparisonData.portfolioComparison?.certificatesComparison?.length ? (
                    comparisonData.portfolioComparison.certificatesComparison.map((c, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                        <span className="font-bold text-white truncate">{c.title}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap ${
                          c.status === 'MATCHED' && c.verified
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}>
                          {c.label}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500">No certifications listed on resume</p>
                  )}
                </div>
              </div>

              {/* GitHub Comparison */}
              {comparisonData.portfolioComparison?.githubComparison && (
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                  <span className="font-bold text-white">GitHub Integration</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                    comparisonData.portfolioComparison.githubComparison.match
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                  }`}>
                    {comparisonData.portfolioComparison.githubComparison.label}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* ── User-Controlled Import Modal ──────────────────────────────────── */}
      <Modal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Import Resume Information to Profile"
        size="md"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setImportModalOpen(false)} disabled={importing}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={importing} onClick={handleConfirmImport}>
              Confirm & Import to Profile
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs text-slate-300">
          <p className="text-slate-400 leading-relaxed">
            Select the extracted information you wish to import into your profile. Only selected items will be added. Existing profile data will not be overwritten.
          </p>

          {/* Select Skills */}
          {parsedData?.skills?.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Select Skills to Import</span>
                <span className="text-[10px] text-slate-500">{selectedImportSkills.length} selected</span>
              </div>
              <div className="max-h-48 overflow-y-auto p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                {parsedData.skills.map((skill) => {
                  const isSelected = selectedImportSkills.includes(skill.value);
                  return (
                    <label key={skill.value} className="flex items-center gap-2 cursor-pointer hover:bg-slate-900 p-1.5 rounded">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedImportSkills((prev) =>
                            isSelected ? prev.filter((s) => s !== skill.value) : [...prev, skill.value]
                          );
                        }}
                        className="rounded border-slate-700 bg-slate-900 text-orange-400 focus:ring-0"
                      />
                      <span className="text-slate-200">{skill.value}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Education import toggle */}
          {parsedData?.education?.length > 0 && (
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedImportEdu}
                  onChange={(e) => setSelectedImportEdu(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-900 text-orange-400 focus:ring-0"
                />
                <div>
                  <span className="font-bold text-white block">Import Education</span>
                  <span className="text-slate-400 text-[11px]">
                    {parsedData.education[0].institution}
                    {parsedData.education[0].degree && ` (${parsedData.education[0].degree})`}
                  </span>
                </div>
              </label>
            </div>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default Resume;
