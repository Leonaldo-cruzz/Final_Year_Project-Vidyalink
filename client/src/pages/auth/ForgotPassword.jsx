import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Mail, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import AuthLayout from '@/layouts/AuthLayout';
import { ROUTES } from '@/constants';
import authService from '@/services/authService';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});

const ForgotPassword = () => {
  const [serverMessage, setServerMessage] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data) => {
    setErrorMessage('');
    setServerMessage('');
    setResetToken('');

    try {
      const response = await authService.forgotPassword(data.email);
      setServerMessage(
        response.message || 'If an account exists with this email, password reset instructions have been generated.'
      );
      if (response.resetToken) {
        setResetToken(response.resetToken);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to submit password reset request. Please try again.'
      );
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your institutional or corporate email address to receive password recovery instructions."
    >
      {serverMessage ? (
        <div className="rounded-md border border-emerald-600/30 bg-emerald-50 p-5 text-emerald-800">
          <div className="mb-3 flex items-center gap-2 font-bold text-emerald-900">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Request Submitted
          </div>
          <p className="text-sm leading-relaxed text-emerald-800">{serverMessage}</p>

          {resetToken && (
            <div className="mt-4 rounded border border-emerald-300 bg-white p-3 text-xs">
              <p className="font-semibold text-gray-700">Development Reset Link:</p>
              <p className="mt-1 font-mono text-[11px] text-gray-600 break-all">
                Token: {resetToken}
              </p>
              <Link
                to={`/reset-password?token=${resetToken}`}
                className="mt-2.5 inline-flex items-center gap-1.5 font-bold text-[#a9603b] hover:text-[#7f452b]"
              >
                <KeyRound className="h-4 w-4" /> Click here to set new password →
              </Link>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-md border border-red-600/25 bg-red-50 px-3.5 py-3 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {errorMessage}
            </div>
          )}

          <div>
            <label
              htmlFor="forgot-email"
              className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-[#53606b]"
            >
              Registered Email Address
            </label>
            <div className="relative">
              <input
                {...register('email')}
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder="you@university.edu"
                className={`form-input !bg-[#fffdf8] !text-[#111820] pl-10 ${errors.email ? 'error' : ''}`}
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6d767c]" />
            </div>
            {errors.email && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {errors.email.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="primary-action w-full rounded-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Sending Request…' : 'Send Recovery Instructions'}
          </button>
        </form>
      )}

      <div className="mt-6 border-t border-[#ddd8ce] pt-5 text-center">
        <Link
          to={ROUTES.LOGIN}
          className="inline-flex items-center gap-2 text-sm font-extrabold text-[#a9603b] hover:text-[#7f452b]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;
