import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { submitVerification } from '@/services/verificationService';
import { getErrorMessage } from '@/utils/formatters';

const SubmitVerificationModal = ({ isOpen, open, onClose, projects = [], onSubmitted }) => {
  const isModalOpen = Boolean(isOpen ?? open);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?._id || '');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Find selected project to check eligibility
  const currentProject = projects.find((p) => p._id === selectedProjectId) || projects[0];

  const isEligible = Boolean(
    currentProject &&
    currentProject.title &&
    (currentProject.shortDescription || currentProject.description) &&
    (currentProject.technologies?.length > 0 || currentProject.techStack?.length > 0)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const projectId = selectedProjectId || currentProject?._id;
    if (!projectId) {
      setError('Please select a project to submit for verification.');
      return;
    }

    if (!isEligible) {
      setError('Complete your project information before submitting.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await submitVerification({
        targetType: 'PROJECT',
        targetId: projectId,
        remarks: remarks.trim() || undefined,
      });

      if (onSubmitted) {
        onSubmitted();
      }
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit verification request.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isModalOpen}
      onClose={onClose}
      title="Submit Project for Faculty Verification"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
            Select Academic Project
          </label>
          {projects.length === 0 ? (
            <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
              No projects found. Please add a project first.
            </p>
          ) : (
            <select
              value={selectedProjectId || currentProject?._id || ''}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-400"
            >
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.title} ({p.verificationStatus || 'Not Submitted'})
                </option>
              ))}
            </select>
          )}
        </div>

        {currentProject && (
          <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-3 text-xs space-y-1.5">
            <p className="text-slate-400 font-medium">Project Review Readiness:</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-3.5 h-3.5 ${currentProject.title ? 'text-emerald-400' : 'text-slate-600'}`} />
                <span className={currentProject.title ? 'text-slate-200' : 'text-slate-500'}>
                  Project Title: <strong>{currentProject.title || 'Missing'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-3.5 h-3.5 ${currentProject.shortDescription || currentProject.description ? 'text-emerald-400' : 'text-slate-600'}`} />
                <span className={currentProject.shortDescription || currentProject.description ? 'text-slate-200' : 'text-slate-500'}>
                  Description: <strong>{currentProject.shortDescription || currentProject.description ? 'Provided' : 'Missing'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-3.5 h-3.5 ${(currentProject.technologies?.length || currentProject.techStack?.length) ? 'text-emerald-400' : 'text-slate-600'}`} />
                <span className={(currentProject.technologies?.length || currentProject.techStack?.length) ? 'text-slate-200' : 'text-slate-500'}>
                  Technologies: <strong>{(currentProject.technologies || currentProject.techStack || []).join(', ') || 'None specified'}</strong>
                </span>
              </div>
            </div>
            {!isEligible && (
              <p className="text-amber-300 text-[11px] pt-1">
                Complete your project information before submitting.
              </p>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
            Submission Notes / Remarks for Faculty (Optional)
          </label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Highlight key implementation details, repository links, or guidance for the faculty reviewer..."
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-400"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            loading={loading}
            disabled={!isEligible || projects.length === 0}
            leftIcon={ShieldCheck}
          >
            Submit for Verification
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default SubmitVerificationModal;
