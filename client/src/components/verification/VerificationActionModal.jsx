import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, MessageSquareWarning, XCircle, AlertCircle } from 'lucide-react';

import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { getVerificationTypeLabel } from './verification.utils';

const remarksSchema = z.object({
  remarks: z.string().trim().max(2000, 'Remarks must not exceed 2000 characters'),
});

const ACTION_CONFIG = {
  approve: {
    title: 'Approve Verification',
    description: 'The student will receive an official verification badge for this portfolio asset.',
    submitLabel: 'Confirm Approval',
    icon: CheckCircle2,
    variant: 'success',
  },
  reject: {
    title: 'Reject Verification',
    description: 'Provide clear, constructive feedback so the student understands why this asset cannot be verified.',
    submitLabel: 'Confirm Rejection',
    icon: XCircle,
    variant: 'danger',
  },
  'request-changes': {
    title: 'Request Changes',
    description: 'Specify the improvements or corrections needed from the student before re-submitting.',
    submitLabel: 'Send Change Request',
    icon: MessageSquareWarning,
    variant: 'secondary',
  },
};

const VerificationActionModal = ({
  open,
  action = 'approve',
  verification,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const config = ACTION_CONFIG[action] || ACTION_CONFIG.approve;
  const requiresRemarks = action === 'reject' || action === 'request-changes';
  const Icon = config.icon;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(remarksSchema),
    defaultValues: { remarks: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ remarks: '' });
    }
  }, [open, reset]);

  const submit = (values) => {
    const trimmed = (values.remarks || '').trim();
    if (requiresRemarks && !trimmed) {
      setError('remarks', {
        type: 'required',
        message: 'Remarks are mandatory when rejecting or requesting changes.',
      });
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={config.title}
      size="md"
      footer={(
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={config.variant}
            size="sm"
            form="verification-action-form"
            type="submit"
            loading={loading}
          >
            {config.submitLabel}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        {/* Banner */}
        <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80">
            <Icon className="h-5 w-5 text-slate-200" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">
              {verification?.student?.fullName || 'Student'} · {getVerificationTypeLabel(verification?.targetType)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{config.description}</p>
          </div>
        </div>

        {/* Remarks Form */}
        <form id="verification-action-form" onSubmit={handleSubmit(submit)} className="space-y-2">
          <label htmlFor="verification-remarks" className="block text-xs font-semibold text-slate-300">
            Faculty Remarks {requiresRemarks ? <span className="text-red-400">* (Required)</span> : <span className="text-slate-500">(Optional)</span>}
          </label>
          <textarea
            id="verification-remarks"
            rows={5}
            placeholder={
              requiresRemarks
                ? 'Clearly specify the exact reason or requirements for the student...'
                : 'Add optional feedback or congratulations for the student...'
            }
            className={`form-input min-h-[110px] w-full resize-y text-xs ${errors.remarks ? 'border-red-500 focus:border-red-500' : ''}`}
            {...register('remarks')}
          />
          {errors.remarks && (
            <p className="flex items-center gap-1 text-xs text-red-400 mt-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {errors.remarks.message}
            </p>
          )}
        </form>
      </div>
    </Modal>
  );
};

export default VerificationActionModal;
