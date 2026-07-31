import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, UserPlus, AlertCircle, Zap, CheckCircle2, Circle } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { ROUTES, REGISTER_ROLES, PASSWORD_RULES, ROLE_ROUTE_MAP } from '@/constants';

// ── Zod Schema ────────────────────────────────────────────────
const registerSchema = z.object({
  fullName: z
    .string()
    .min(3, 'Full name must be at least 3 characters')
    .max(80, 'Full name must not exceed 80 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/, 'Must contain a special character'),
  role: z.enum(['student', 'faculty', 'recruiter', 'alumni']),
  college: z.string().max(120).optional(),
  branch: z.string().max(80).optional(),
  graduationYear: z
    .string()
    .optional()
    .refine((v) => !v || (Number(v) >= 1950 && Number(v) <= 2100), {
      message: 'Enter a valid graduation year',
    }),
});

// ── Component ─────────────────────────────────────────────────
const Register = () => {
  const { register: registerUser, login, isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'student' },
  });

  const watchedPassword = watch('password', '');
  const watchedRole = watch('role', 'student');

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      navigate(ROLE_ROUTE_MAP[user.role] || '/dashboard/student', { replace: true });
    }
  }, [isAuthenticated, loading, user, navigate]);

  const onSubmit = async (data) => {
    setSubmitError('');
    const payload = {
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      role: data.role,
      ...(data.college?.trim()      && { college: data.college.trim() }),
      ...(data.branch?.trim()       && { branch: data.branch.trim() }),
      ...(data.graduationYear       && { graduationYear: Number(data.graduationYear) }),
    };

    try {
      await registerUser(payload);
      // Auto-login after register
      const loggedInUser = await login({ email: payload.email, password: payload.password });
      navigate(ROLE_ROUTE_MAP[loggedInUser.role] || '/dashboard/student', { replace: true });
    } catch (err) {
      setSubmitError(err.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #020617 0%, #0a0f2e 50%, #020617 100%)' }}
    >
      {/* Background glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/8 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] rounded-full bg-purple-600/6 blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl mx-auto px-4 py-12 relative z-10 fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-500/30 mb-4">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">
            Create your account
          </h1>
          <p className="text-slate-400 text-sm">
            Join VidyaLink's unified academic network
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">

          {/* Error banner */}
          {submitError && (
            <div className="mb-6 flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">

            {/* Role Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-3">
                I am a…
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {REGISTER_ROLES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setValue('role', r.id, { shouldValidate: true })}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all duration-150
                      ${watchedRole === r.id
                        ? 'bg-blue-600/15 border-blue-500 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'}`}
                  >
                    <span className="text-xl">{r.icon}</span>
                    <span className="text-xs font-bold">{r.label}</span>
                    <span className="text-[10px] text-slate-500 leading-tight">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Full Name + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2">
                  Full Name *
                </label>
                <input
                  {...register('fullName')}
                  type="text"
                  id="register-fullname"
                  placeholder="Alex Johnson"
                  autoComplete="name"
                  className={`form-input ${errors.fullName ? 'error' : ''}`}
                />
                {errors.fullName && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{errors.fullName.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2">
                  Email Address *
                </label>
                <input
                  {...register('email')}
                  type="email"
                  id="register-email"
                  placeholder="you@university.edu"
                  autoComplete="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                />
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{errors.email.message}
                  </p>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2">
                Password *
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="register-password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={`form-input pr-11 ${errors.password ? 'error' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength */}
              {watchedPassword.length > 0 && (
                <div className="mt-3 p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 grid grid-cols-2 gap-1.5">
                  {PASSWORD_RULES.map(({ key, label, test }) => {
                    const passed = test(watchedPassword);
                    return (
                      <span key={key} className={`flex items-center gap-1.5 text-[11px] font-medium ${passed ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {passed
                          ? <CheckCircle2 className="w-3 h-3" />
                          : <Circle className="w-3 h-3" />}
                        {label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Academic Info (optional) */}
            <div className="border-t border-slate-800/60 pt-5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Academic Details (Optional)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  {...register('college')}
                  type="text"
                  id="register-college"
                  placeholder="College / University"
                  className="form-input text-sm"
                />
                <input
                  {...register('branch')}
                  type="text"
                  id="register-branch"
                  placeholder="Branch / Major"
                  className="form-input text-sm"
                />
                <input
                  {...register('graduationYear')}
                  type="number"
                  id="register-gradyear"
                  placeholder="Graduation Year"
                  min="1950"
                  max="2100"
                  className="form-input text-sm"
                />
              </div>
              {errors.graduationYear && (
                <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{errors.graduationYear.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="register-submit"
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
                  <span>Creating account…</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to={ROUTES.LOGIN} className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
