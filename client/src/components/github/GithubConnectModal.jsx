import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Code2 as Github, ExternalLink } from 'lucide-react';

import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { connectGithub } from '@/services/githubService';
import { getErrorMessage } from '@/utils/formatters';

const githubUsernamePattern = /^(?!-)[A-Za-z\d](?:[A-Za-z\d-]{0,37}[A-Za-z\d])?$/;

const formSchema = z.object({
  githubUsername: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim().replace(/^@/, '') : value),
    z.string()
      .min(1, 'GitHub username is required')
      .max(39, 'GitHub username must not exceed 39 characters')
      .regex(githubUsernamePattern, 'Use letters, numbers, and hyphens only')
  ),
});

const GithubConnectModal = ({ open, onClose, onSuccess }) => {
  const [submitError, setSubmitError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { githubUsername: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ githubUsername: '' });
      setSubmitError('');
    }
  }, [open, reset]);

  const onSubmit = async ({ githubUsername }) => {
    try {
      setSubmitError('');
      const response = await connectGithub(githubUsername);
      onSuccess(response.data);
      onClose();
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Unable to connect this GitHub account'));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Connect GitHub"
      size="md"
      footer={(
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" form="github-connect-form" leftIcon={Github} loading={isSubmitting}>Connect GitHub</Button>
        </>
      )}
    >
      <form id="github-connect-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <Github className="mt-0.5 h-5 w-5 flex-shrink-0 text-white" />
          <div>
            <p className="text-sm font-semibold text-white">Connect your public GitHub profile</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">We only save your public profile snapshot. Repository analysis and scoring are not part of this connection.</p>
          </div>
        </div>

        <div>
          <label htmlFor="github-username" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">GitHub Username *</label>
          <div className="relative">
            <Github className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input id="github-username" {...register('githubUsername')} className="form-input pl-10" placeholder="e.g. octocat" autoComplete="off" />
          </div>
          {errors.githubUsername && <p className="mt-1 text-xs text-red-400">{errors.githubUsername.message}</p>}
        </div>

        <a href="https://github.com/settings/profile" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400">
          Where do I find my username? <ExternalLink className="h-3.5 w-3.5" />
        </a>
        {submitError && <p className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-400">{submitError}</p>}
      </form>
    </Modal>
  );
};

export default GithubConnectModal;
