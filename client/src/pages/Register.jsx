import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Check, Eye, EyeOff, UserPlus } from 'lucide-react';
import AuthLayout from '@/layouts/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { PASSWORD_RULES, REGISTER_ROLES, ROLE_ROUTE_MAP, ROUTES } from '@/constants';

const registerSchema = z.object({
  fullName: z.string().min(3, 'Full name must be at least 3 characters').max(80, 'Full name must not exceed 80 characters').regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/[A-Z]/, 'Must contain an uppercase letter').regex(/[a-z]/, 'Must contain a lowercase letter').regex(/[0-9]/, 'Must contain a number').regex(/[!@#$%^&*()_+=\-[\]{};':"\\|,.<>/?`~]/, 'Must contain a special character'),
  role: z.enum(['student', 'faculty', 'recruiter', 'alumni']),
  college: z.string().max(120).optional(),
  branch: z.string().max(80).optional(),
  graduationYear: z.string().optional().refine((value) => !value || (Number(value) >= 1950 && Number(value) <= 2100), { message: 'Enter a valid graduation year' }),
});

const FieldError = ({ message }) => message && <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{message}</p>;

const Register = () => {
  const { register: registerUser, login, isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(registerSchema), defaultValues: { role: 'student' } });
  const watchedPassword = watch('password', '');
  const watchedRole = watch('role', 'student');

  useEffect(() => {
    if (!loading && isAuthenticated && user) navigate(ROLE_ROUTE_MAP[user.role] || ROUTES.STUDENT_DASHBOARD, { replace: true });
  }, [isAuthenticated, loading, navigate, user]);

  const onSubmit = async (data) => {
    setSubmitError('');
    const payload = { fullName: data.fullName.trim(), email: data.email.trim().toLowerCase(), password: data.password, role: data.role, ...(data.college?.trim() && { college: data.college.trim() }), ...(data.branch?.trim() && { branch: data.branch.trim() }), ...(data.graduationYear && { graduationYear: Number(data.graduationYear) }) };
    try {
      await registerUser(payload);
      const loggedInUser = await login({ email: payload.email, password: payload.password });
      navigate(ROLE_ROUTE_MAP[loggedInUser.role] || ROUTES.STUDENT_DASHBOARD, { replace: true });
    } catch (error) {
      setSubmitError(error.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Choose the view that matches how you contribute to the academic network.">
      {submitError && <div role="alert" className="mb-5 flex items-start gap-3 rounded-md border border-red-600/25 bg-red-50 px-3.5 py-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />{submitError}</div>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.12em] text-[#53606b]">I am joining as</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {REGISTER_ROLES.map((role) => (
              <button key={role.id} type="button" onClick={() => setValue('role', role.id, { shouldValidate: true })} className={`rounded-md border p-3 text-left transition ${watchedRole === role.id ? 'border-[#c98254] bg-[#c98254]/10 text-[#7f452b]' : 'border-[#ddd8ce] bg-[#fffdf8] text-[#6d767c] hover:border-[#c98254]/60'}`} aria-pressed={watchedRole === role.id}>
                <span className="block text-sm font-extrabold">{role.label}</span><span className="mt-1 block text-[10px] leading-snug">{role.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="register-fullname" className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-[#53606b]">Full name</label><input {...register('fullName')} id="register-fullname" autoComplete="name" placeholder="Alex Johnson" className={`form-input !bg-[#fffdf8] !text-[#111820] ${errors.fullName ? 'error' : ''}`} /><FieldError message={errors.fullName?.message} /></div>
          <div><label htmlFor="register-email" className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-[#53606b]">Email address</label><input {...register('email')} id="register-email" type="email" autoComplete="email" placeholder="you@university.edu" className={`form-input !bg-[#fffdf8] !text-[#111820] ${errors.email ? 'error' : ''}`} /><FieldError message={errors.email?.message} /></div>
        </div>
        <div>
          <label htmlFor="register-password" className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-[#53606b]">Password</label>
          <div className="relative"><input {...register('password')} id="register-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Create a strong password" className={`form-input !bg-[#fffdf8] !text-[#111820] pr-11 ${errors.password ? 'error' : ''}`} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6d767c] hover:text-[#111820]" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
          <FieldError message={errors.password?.message} />
          {watchedPassword && <div className="mt-3 grid grid-cols-2 gap-2 rounded-md border border-[#ddd8ce] bg-[#f5f1e9] p-3">{PASSWORD_RULES.map(({ key, label, test }) => <span key={key} className={`flex items-center gap-1.5 text-[11px] font-semibold ${test(watchedPassword) ? 'text-[#4f8a70]' : 'text-[#8b9499]'}`}>{test(watchedPassword) ? <Check className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border border-current" />} {label}</span>)}</div>}
        </div>
        <div className="border-t border-[#ddd8ce] pt-5">
          <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#6d767c]">Academic details · optional</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label htmlFor="register-college" className="sr-only">College or university</label><input {...register('college')} id="register-college" placeholder="College / university" className="form-input !bg-[#fffdf8] !text-[#111820] text-sm" /></div>
            <div><label htmlFor="register-branch" className="sr-only">Branch or major</label><input {...register('branch')} id="register-branch" placeholder="Branch / major" className="form-input !bg-[#fffdf8] !text-[#111820] text-sm" /></div>
            <div><label htmlFor="register-gradyear" className="sr-only">Graduation year</label><input {...register('graduationYear')} id="register-gradyear" type="number" min="1950" max="2100" placeholder="Graduation year" className="form-input !bg-[#fffdf8] !text-[#111820] text-sm" /></div>
          </div>
          <FieldError message={errors.graduationYear?.message} />
        </div>
        <button type="submit" id="register-submit" disabled={isSubmitting} className="primary-action w-full rounded-md disabled:cursor-not-allowed disabled:opacity-50"><UserPlus className="mr-2 h-4 w-4" />{isSubmitting ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="mt-6 border-t border-[#ddd8ce] pt-5 text-center text-sm text-[#6d767c]">Already have an account? <Link to={ROUTES.LOGIN} className="font-extrabold text-[#a9603b] hover:text-[#7f452b]">Sign in <span aria-hidden="true">→</span></Link></p>
    </AuthLayout>
  );
};

export default Register;
