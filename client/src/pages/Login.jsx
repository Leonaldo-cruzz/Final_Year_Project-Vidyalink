import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react';
import AuthLayout from '@/layouts/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { ROLE_ROUTE_MAP, ROUTES } from '@/constants';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
});

const FieldError = ({ message }) => message && (
  <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
    <AlertCircle className="h-3 w-3 flex-shrink-0" />
    {message}
  </p>
);

const Login = () => {
  const { login, isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const from = location.state?.from?.pathname || null;
  const sessionExpired = new URLSearchParams(location.search).get('session') === 'expired';
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      navigate(from || ROLE_ROUTE_MAP[user.role] || ROUTES.STUDENT_DASHBOARD, { replace: true });
    }
  }, [from, isAuthenticated, loading, navigate, user]);

  const onSubmit = async (data) => {
    setSubmitError('');
    try {
      const loggedInUser = await login(data);
      navigate(from || ROLE_ROUTE_MAP[loggedInUser.role] || ROUTES.STUDENT_DASHBOARD, { replace: true });
    } catch (error) {
      setSubmitError(error.message || 'Invalid email or password');
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your university or industry partner account.">
      {sessionExpired && (
        <div className="mb-5 flex items-start gap-3 rounded-md border border-amber-600/30 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          Your session expired. Please sign in again.
        </div>
      )}

      {submitError && (
        <div role="alert" className="mb-5 flex items-start gap-3 rounded-md border border-red-600/25 bg-red-50 px-3.5 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <label htmlFor="login-email" className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-[#53606b]">
            Institutional or Corporate Email
          </label>
          <input
            {...register('email')}
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@university.edu"
            className={`form-input !bg-[#fffdf8] !text-[#111820] ${errors.email ? 'error' : ''}`}
          />
          <FieldError message={errors.email?.message} />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="login-password" className="block text-xs font-extrabold uppercase tracking-[0.12em] text-[#53606b]">
              Password
            </label>
            <Link to={ROUTES.FORGOT} className="text-xs font-bold text-[#a9603b] hover:text-[#7f452b]">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              {...register('password')}
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Your password"
              className={`form-input !bg-[#fffdf8] !text-[#111820] pr-11 ${errors.password ? 'error' : ''}`}
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
          <FieldError message={errors.password?.message} />
        </div>

        <button
          type="submit"
          id="login-submit"
          disabled={isSubmitting}
          className="primary-action w-full rounded-md disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogIn className="mr-2 h-4 w-4" />
          {isSubmitting ? 'Authenticating…' : 'Sign in to VidyaLink'}
        </button>
      </form>

      <p className="mt-6 border-t border-[#ddd8ce] pt-5 text-center text-sm text-[#6d767c]">
        Don't have an account?{' '}
        <Link to={ROUTES.REGISTER} className="font-extrabold text-[#a9603b] hover:text-[#7f452b]">
          Register institutional account <span aria-hidden="true">→</span>
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
