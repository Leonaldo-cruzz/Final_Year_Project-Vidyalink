import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  UploadCloud,
  FileText,
  Trash2,
  RefreshCw,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileCheck,
  Calendar,
  HardDrive,
} from 'lucide-react';

import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Spinner, { FullPageSpinner } from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { getResume, uploadResume, replaceResume, deleteResume } from '@/services/resumeService';
import { getErrorMessage, formatDate } from '@/utils/formatters';

// ── Validation Schema ─────────────────────────────────────────
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const resumeSchema = z.object({
  resumeFile: z
    .any()
    .refine((files) => files && files.length > 0, 'Please select a PDF file')
    .refine(
      (files) => files?.[0]?.type === 'application/pdf' || files?.[0]?.name?.toLowerCase().endsWith('.pdf'),
      'Only PDF files are allowed'
    )
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, 'File size must not exceed 5 MB'),
});

// Helper format bytes
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const Resume = () => {
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fileInputRef = useRef(null);

  const {
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resumeSchema),
  });

  // Fetch initial resume
  useEffect(() => {
    fetchResume();
  }, []);

  const fetchResume = async () => {
    try {
      setLoading(true);
      const res = await getResume();
      setResume(res.data || null);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to fetch resume'));
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setActionError('');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const showError = (msg) => {
    setActionError(msg);
    setSuccessMessage('');
  };

  // Drag & Drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (file) => {
    showError('');
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showError('Only PDF files are allowed');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showError('File size must not exceed 5 MB');
      return;
    }

    setSelectedFile(file);
    // Create DataTransfer object to sync with react-hook-form
    const dt = new DataTransfer();
    dt.items.add(file);
    setValue('resumeFile', dt.files, { shouldValidate: true });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  // Submit Handler (Upload or Replace)
  const onSubmit = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      showError('');

      let response;
      if (resume) {
        response = await replaceResume(selectedFile);
        showSuccess('Resume replaced successfully!');
      } else {
        response = await uploadResume(selectedFile);
        showSuccess('Resume uploaded successfully!');
      }

      setResume(response.data);
      setSelectedFile(null);
      reset();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to upload resume'));
    } finally {
      setUploading(false);
    }
  };

  // Delete Handler
  const handleDelete = async () => {
    try {
      setUploading(true);
      await deleteResume();
      setResume(null);
      setSelectedFile(null);
      setDeleteModalOpen(false);
      reset();
      if (fileInputRef.current) fileInputRef.current.value = '';
      showSuccess('Resume deleted successfully');
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to delete resume'));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <FullPageSpinner message="Loading resume details…" />;
  }

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Resume Management
              <Badge variant="purple" size="sm">PDF Only</Badge>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Upload your verified resume for automated ATS scoring and recruiter visibility.
            </p>
          </div>

          {resume && (
            <Badge variant="success" size="md" className="flex items-center gap-1.5 py-1.5 px-3">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>Resume Active</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Banners */}
      {successMessage && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {actionError && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Main Section — Upload & Card */}
        <div className="lg:col-span-2 space-y-6">

          {/* Active Resume Card (If uploaded) */}
          {resume ? (
            <SectionCard
              title="Current Resume"
              subtitle="Active resume attached to your Vidyalink profile"
              action={
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={Eye}
                    onClick={() => setPreviewModalOpen(true)}
                  >
                    Preview
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    leftIcon={Trash2}
                    onClick={() => setDeleteModalOpen(true)}
                  >
                    Delete
                  </Button>
                </div>
              }
            >
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <div className="flex items-start justify-between flex-wrap sm:flex-nowrap gap-4">
                  {/* File Icon & Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white leading-tight break-all">
                        {resume.originalFileName}
                      </h3>
                      <div className="flex items-center flex-wrap gap-4 text-xs text-slate-400 mt-2">
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                          {formatFileSize(resume.fileSize)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          Uploaded {formatDate(resume.uploadedAt || resume.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                    <a
                      href={resume.fileUrl}
                      download={resume.originalFileName}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" leftIcon={Download}>
                        Download
                      </Button>
                    </a>
                  </div>
                </div>
              </div>

              {/* Replace Banner */}
              <div className="mt-6 pt-6 border-t border-slate-800/80">
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-400" />
                  Replace Existing Resume
                </h4>
                <p className="text-xs text-slate-400 mb-4">
                  Uploading a new PDF file will automatically replace your current active resume.
                </p>
              </div>
            </SectionCard>
          ) : null}

          {/* Upload Dropzone Form */}
          <SectionCard
            title={resume ? 'Select New File to Replace' : 'Upload Resume'}
            subtitle="Drag & drop your resume PDF or browse from your computer"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Dropzone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
                  transition-all duration-200 flex flex-col items-center justify-center min-h-[220px]
                  ${
                    dragActive
                      ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-900/60'
                  }
                `}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="application/pdf,.pdf"
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-7 h-7 text-blue-400" />
                </div>

                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-blue-400 flex items-center justify-center gap-1.5">
                      <FileText className="w-4 h-4" />
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      Size: {formatFileSize(selectedFile.size)}
                    </p>
                    <span className="inline-block text-[11px] text-emerald-400 font-semibold mt-1">
                      Ready to upload
                    </span>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-200 mb-1">
                      Drag & drop your resume PDF here, or <span className="text-blue-400 underline">browse</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Supports PDF format only (Max 5 MB)
                    </p>
                  </>
                )}
              </div>

              {/* Hook form error */}
              {errors.resumeFile && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {errors.resumeFile.message}
                </p>
              )}

              {/* Upload Progress Bar (when uploading) */}
              {uploading && (
                <div className="space-y-2 py-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-2">
                      <Spinner size="sm" /> Uploading resume…
                    </span>
                    <span className="font-semibold text-blue-400">Processing</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-600 to-emerald-400 animate-pulse w-full rounded-full" />
                  </div>
                </div>
              )}

              {/* Upload Button */}
              <div className="flex justify-end gap-3 pt-2">
                {selectedFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => {
                      setSelectedFile(null);
                      reset();
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={!selectedFile || uploading}
                  loading={uploading}
                  leftIcon={resume ? RefreshCw : UploadCloud}
                >
                  {resume ? 'Replace Resume' : 'Upload Resume'}
                </Button>
              </div>
            </form>
          </SectionCard>

        </div>

        {/* Right Section — Instructions & ATS Info */}
        <div className="space-y-6">
          <SectionCard title="Resume Requirements">
            <div className="space-y-4 text-xs text-slate-300">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-bold text-white mb-0.5">PDF Format Required</p>
                  <p className="text-slate-400 leading-relaxed">
                    Only document files in standard Portable Document Format (.pdf) are accepted.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-bold text-white mb-0.5">5 MB Maximum Size</p>
                  <p className="text-slate-400 leading-relaxed">
                    Keep your file size below 5 MB to ensure fast parsing and recruiter previewing.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-bold text-white mb-0.5">Single Active Resume</p>
                  <p className="text-slate-400 leading-relaxed">
                    Uploading a new resume automatically updates your active profile across all applications.
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="ATS Optimization Tip">
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-purple-400">
                <Sparkles className="w-4 h-4" />
                <span>Preparation for AI Scoring</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Ensure your PDF contains clear text headings (Education, Skills, Experience) for accurate ATS verification.
              </p>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Preview Modal */}
      {resume && (
        <Modal
          open={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          title={`Preview: ${resume.originalFileName}`}
          size="lg"
        >
          <div className="w-full h-[65vh] rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
            <iframe
              src={resume.fileUrl}
              title="Resume Preview"
              className="w-full h-full border-0"
            />
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Resume Deletion"
        size="sm"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={uploading}
              onClick={handleDelete}
            >
              Delete Permanently
            </Button>
          </div>
        }
      >
        <div className="flex items-center gap-3 text-slate-300 text-sm">
          <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
          <p>
            Are you sure you want to delete your active resume? This action cannot be undone.
          </p>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default Resume;
