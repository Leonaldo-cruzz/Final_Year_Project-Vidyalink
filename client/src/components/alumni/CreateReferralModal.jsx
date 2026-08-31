import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Share2, Building2, Briefcase, Link, Send } from 'lucide-react';

const CreateReferralModal = ({ isOpen, onClose, student, onSubmit, loading = false }) => {
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [message, setMessage] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [status, setStatus] = useState('SUBMITTED');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!company.trim()) {
      setError('Please provide the company name');
      return;
    }
    if (!jobTitle.trim()) {
      setError('Please provide the job title / role');
      return;
    }

    try {
      await onSubmit({
        studentId: student._id || student.id,
        company: company.trim(),
        jobTitle: jobTitle.trim(),
        jobUrl: jobUrl.trim(),
        message: message.trim(),
        status,
        internalNotes: internalNotes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create referral');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Create Job Referral — ${student?.fullName || 'Candidate'}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
            {student?.fullName?.charAt(0) || 'S'}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100">{student?.fullName}</h4>
            <p className="text-xs text-slate-400">
              {student?.college} {student?.branch ? `• ${student.branch}` : ''}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Company Name <span className="text-rose-400">*</span>
            </label>
            <Input
              placeholder="e.g. Google, Microsoft, Atlassian, Razorpay"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Job Title / Position <span className="text-rose-400">*</span>
            </label>
            <Input
              placeholder="e.g. Software Engineer (Frontend / SRE)"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Job Posting / Portal URL (Optional)
          </label>
          <Input
            placeholder="https://careers.company.com/job/12345"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Referral Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 focus:outline-none"
          >
            <option value="DRAFT">DRAFT (Save for later)</option>
            <option value="SUBMITTED">SUBMITTED (Ready / Notified to student)</option>
            <option value="UNDER_REVIEW">UNDER_REVIEW (Recruiter reviewing)</option>
            <option value="REFERRED">REFERRED (Officially submitted to internal portal)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Note / Message to Student (Optional)
          </label>
          <textarea
            className="w-full h-20 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            placeholder="Advice, internal job ID, or referral instructions..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Internal Private Notes (Visible only to you)
          </label>
          <textarea
            className="w-full h-16 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            placeholder="e.g. Spoke with hiring manager, candidate looks solid for team X"
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            <Share2 className="w-4 h-4 mr-1.5" />
            Create Referral
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateReferralModal;
