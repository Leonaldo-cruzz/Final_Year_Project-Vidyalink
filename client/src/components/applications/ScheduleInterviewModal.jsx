import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, AlertCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { scheduleInterview } from '@/services/applicationService';
import { getErrorMessage } from '@/utils/formatters';

const interviewSchema = z.object({
  interviewDate: z.string().min(1, 'Interview date & time is required'),
  interviewMode: z.enum(['Online', 'In-person']),
  recruiterNotes: z.string().max(2000).optional(),
});

const ScheduleInterviewModal = ({ open, onClose, application, onSuccess }) => {
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(interviewSchema),
    defaultValues: {
      interviewMode: 'Online',
    },
  });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      await scheduleInterview(application._id, data);
      reset();
      onSuccess?.();
      onClose();
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  if (!application) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Schedule Interview: ${application.student?.fullName || application.studentId?.fullName || 'Candidate'}`}
      size="md"
    >
      {serverError && (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Interview Date & Time *
          </label>
          <input
            {...register('interviewDate')}
            type="datetime-local"
            className={`form-input ${errors.interviewDate ? 'error' : ''}`}
          />
          {errors.interviewDate && (
            <p className="mt-1 text-xs text-red-400">{errors.interviewDate.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Interview Mode *
          </label>
          <select {...register('interviewMode')} className="form-input">
            <option value="Online">Online Video Call</option>
            <option value="In-person">In-person Meeting</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Notes / Instructions for Candidate
          </label>
          <textarea
            {...register('recruiterNotes')}
            rows={3}
            placeholder="Include meeting link, venue, or interview preparations..."
            className="form-input resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} leftIcon={Calendar}>
            Schedule Interview
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ScheduleInterviewModal;
