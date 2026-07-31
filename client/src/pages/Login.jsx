import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, LogIn, AlertCircle, Zap } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { ROLE_ROUTE_MAP, ROUTES } from '@/constants';

// ── Zod Schema ────────────────────────────────────────────────
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

// ── Demo Accounts ─────────────────────────────────────────────
const DEMO_ACCOUNTS = [
  { label: 'Student',   icon: '🎓', email: 'student@vidyalink.edu'   },
  { label: 'Faculty',   icon: '🏫', email: 'faculty@vidyalink.edu'   },
  { label: 'Recruiter', icon: '💼', email: 'recruiter@vidyalink.edu' },
  { label: 'Alumni',    icon: '🌟', email: 'alumni@vidyalink.edu'    },
];

// ── Component ─────────────────────────────────────────────────
const Login = () => {
  const { login, isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const from = location.state?.from?.pathname || null;
  const sessionExpired = new URLSearchParams(location.search).get('session') === 'expired';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const dest = from || ROLE_ROUTE_MAP[user.role] || '/dashboard/student';
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, loading, user, from, navigate]);

  const onSubmit = async (data) => {
    setSubmitError('');
    try {
      const loggedInUser = await login(data);
      const dest = from || ROLE_ROUTE_MAP[loggedInUser.role] || '/dashboard/student';
      navigate(dest, { replace: true });
    } catch (err) {
      setSubmitError(err.message || 'Invalid email or password');
    }
  };

  const fillDemo = (email) => {
    setValue('email', email, { shouldValidate: false });
    setValue('password', 'Password123!', { shouldValidate: false });
    setSubmitError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-mesh"
         style={{ background: 'linear-gradient(135deg, #020617 0%, #0a0f2e 50%, #020617 100%)' }}>
      {/* Background glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/8 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-600/6 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md mx-auto px-4 py-12 relative z-10 fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-500/30 mb-4">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">
            Welcome back
          </h1>
          <p className="text-slate-400 text-sm">
            Sign in to your VidyaLink account
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">

          {/* Session expired banner */}
          {sessionExpired && (
            <div className="mb-5 flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Your session expired. Please sign in again.</span>
            </div>
          )}

          {/* Error banner */}
          {submitError && (
            <div className="mb-5 flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2">
                Email Address
              </label>
              <input
                {...register('email')}
                type="email"
                id="login-email"
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

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest">
                  Password
                </label>
                <Link
                  to={ROUTES.FORGOT}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="login-password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`form-input pr-11 ${errors.password ? 'error' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="login-submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white
                         bg-gradient-to-r from-blue-600 to-blue-500
                         hover:from-blue-500 hover:to-blue-400
                         shadow-lg shadow-blue-500/25
                         transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Demo Quick-Fill */}
          <div className="mt-7 pt-6 border-t border-slate-800/70">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest text-center mb-3">
              Quick Demo Autofill
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map(({ label, icon, email }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => fillDemo(email)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-800
                             hover:border-blue-500/40 hover:bg-slate-800/80 text-slate-300 text-xs font-medium
                             transition-all duration-150 text-left"
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Register link */}
          <p className="mt-6 text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <Link to={ROUTES.REGISTER} className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
              Create one →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
