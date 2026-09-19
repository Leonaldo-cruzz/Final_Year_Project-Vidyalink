import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '@/layouts/AuthLayout';
import { ROUTES } from '@/constants';
import authService from '@/services/authService';

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    token: z.string().min(1, 'Reset token is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const initialToken = searchParams.get('token') || '';

  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: initialToken,
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data) => {
    setErrorMessage('');
    try {
      await authService.resetPassword(data.token, data.password);
      setIsSuccess(true);
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to reset password. The link may have expired or is invalid.'
      );
    }
  };

  return (
    <AuthLayout
      title="Set new password"
      subtitle="Enter and confirm your new secure password to restore workspace access."
    >
      {isSuccess ? (
        <div className="rounded-md border border-emerald-600/30 bg-emerald-50 p-5 text-emerald-800">
          <div className="mb-3 flex items-center gap-2 font-bold text-emerald-900">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Password Reset Successful
          </div>
          <p className="text-sm leading-relaxed text-emerald-800">
            Your password has been successfully updated. You can now sign in to your Vidyalink workspace using your new credentials.
          </p>
          <div className="mt-5">
            <Link
              to={ROUTES.LOGIN}
              className="primary-action inline-flex w-full items-center justify-center rounded-md"
            >
              Sign In with New Password
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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
              htmlFor="reset-token"
              className="mb-1.5 block text-xs font-extrabold uppercase tracking-[0.12em] text-[#53606b]"
            >
              Reset Authorization Token
            </label>
            <input
              {...register('token')}
              id="reset-token"
              type="text"
              placeholder="Paste token or use reset link"
              className={`form-input !bg-[#fffdf8] !text-[#111820] font-mono text-xs ${
                errors.token ? 'error' : ''
              }`}
            />
            {errors.token && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {errors.token.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="new-password"
              className="mb-1.5 block text-xs font-extrabold uppercase tracking-[0.12em] text-[#53606b]"
            >
              New Password
            </label>
            <div className="relative">
              <input
                {...register('password')}
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                className={`form-input !bg-[#fffdf8] !text-[#111820] pr-11 ${
                  errors.password ? 'error' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6d767c] hover:text-[#111820]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-1.5 block text-xs font-extrabold uppercase tracking-[0.12em] text-[#53606b]"
            >
              Confirm New Password
            </label>
            <input
              {...register('confirmPassword')}
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Re-enter your new password"
              className={`form-input !bg-[#fffdf8] !text-[#111820] ${
                errors.confirmPassword ? 'error' : ''
              }`}
            />
            {errors.confirmPassword && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="primary-action mt-2 w-full rounded-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Updating Password…' : 'Update Password & Return to Sign In'}
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

export default ResetPassword;
