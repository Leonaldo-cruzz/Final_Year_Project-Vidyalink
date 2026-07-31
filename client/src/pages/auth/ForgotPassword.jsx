import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, AlertCircle, Zap, CheckCircle2 } from 'lucide-react';

import { ROUTES } from '@/constants';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});

const ForgotPassword = () => {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const email = watch('email', '');

  const onSubmit = async (data) => {
    // TODO: wire to POST /api/v1/auth/forgot-password when backend adds it
    await new Promise((r) => setTimeout(r, 1000));
    setSent(true);
    void data;
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #020617 0%, #0a0f2e 50%, #020617 100%)' }}
    >
      <div className="absolute top-0 left-1/3 w-[400px] h-[400px] rounded-full bg-blue-600/8 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md mx-auto px-4 py-12 relative z-10 fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-500/30 mb-4">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">
            Reset password
          </h1>
          <p className="text-slate-400 text-sm">
            We'll send you a reset link if your email is registered.
          </p>
        </div>

        <div className="glass-card p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Check your inbox</h2>
              <p className="text-slate-400 text-sm mb-6">
                If <span className="text-blue-400 font-medium">{email}</span> is registered, you'll receive a reset link shortly.
              </p>
              <Link
                to={ROUTES.LOGIN}
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    {...register('email')}
                    type="email"
                    id="forgot-email"
                    placeholder="you@university.edu"
                    autoComplete="email"
                    className={`form-input pl-10 ${errors.email ? 'error' : ''}`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{errors.email.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                id="forgot-submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white
                           bg-gradient-to-r from-blue-600 to-blue-500
                           hover:from-blue-500 hover:to-blue-400
                           shadow-lg shadow-blue-500/25
                           transition-all duration-200
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sending…</span>
                  </>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>

              <Link
                to={ROUTES.LOGIN}
                className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
