import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const ROLES = [
  { id: 'student', label: 'Student', desc: 'Enrolled learner or candidate' },
  { id: 'faculty', label: 'Faculty', desc: 'Professor or research guide' },
  { id: 'alumni', label: 'Alumni', desc: 'Graduate & industry mentor' },
  { id: 'recruiter', label: 'Recruiter', desc: 'Talent acquisition partner' },
];

const Register = () => {
  const { register, login, isAuthenticated, error: authError, setError } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'student',
    college: '',
    branch: '',
    graduationYear: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    return () => setError(null);
  }, [setError]);

  // Password rules evaluation
  const passRules = {
    minLen: formData.password.length >= 8,
    hasUpper: /[A-Z]/.test(formData.password),
    hasLower: /[a-z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(formData.password),
  };

  const isPasswordValid = Object.values(passRules).every(Boolean);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!formData.fullName.trim() || formData.fullName.trim().length < 3) {
      setLocalError('Full name must be at least 3 characters.');
      return;
    }

    if (!formData.email.trim()) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    if (!isPasswordValid) {
      setLocalError('Password does not meet required strength criteria.');
      return;
    }

    const payload = {
      fullName: formData.fullName.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      role: formData.role,
      ...(formData.college.trim() && { college: formData.college.trim() }),
      ...(formData.branch.trim() && { branch: formData.branch.trim() }),
      ...(formData.graduationYear && { graduationYear: Number(formData.graduationYear) }),
    };

    try {
      setSubmitting(true);
      await register(payload);

      // Auto login after successful registration
      try {
        await login({ email: payload.email, password: payload.password });
        navigate('/dashboard');
      } catch {
        navigate('/login', { state: { registered: true } });
      }
    } catch (err) {
      setLocalError(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative">
        <div className="absolute w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -top-20" />

        <div className="max-w-xl w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative z-10 my-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4 text-indigo-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Create Account</h1>
            <p className="text-slate-400 text-sm mt-1">Join VidyaLink's unified academic network</p>
          </div>

          {(localError || authError) && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-xs font-semibold text-red-400 flex items-start space-x-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{localError || authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection Tabs */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, role: r.id }))}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.role === r.id
                        ? 'bg-indigo-600/15 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold capitalize">{r.label}</div>
                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Alex Johnson"
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="alex@university.edu"
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs font-medium focus:outline-none"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              {/* Strength Checklist */}
              {formData.password.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <span className={passRules.minLen ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                    {passRules.minLen ? '✓' : '○'} Min 8 characters
                  </span>
                  <span className={passRules.hasUpper ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                    {passRules.hasUpper ? '✓' : '○'} Uppercase letter
                  </span>
                  <span className={passRules.hasLower ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                    {passRules.hasLower ? '✓' : '○'} Lowercase letter
                  </span>
                  <span className={passRules.hasNumber ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                    {passRules.hasNumber ? '✓' : '○'} Number
                  </span>
                  <span className={passRules.hasSpecial ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                    {passRules.hasSpecial ? '✓' : '○'} Special character
                  </span>
                </div>
              )}
            </div>

            {/* Optional Academic Details */}
            <div className="border-t border-slate-800/80 pt-4 space-y-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Academic Info (Optional)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <input
                    type="text"
                    name="college"
                    value={formData.college}
                    onChange={handleChange}
                    placeholder="College / University"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    name="branch"
                    value={formData.branch}
                    onChange={handleChange}
                    placeholder="Branch / Major"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    name="graduationYear"
                    value={formData.graduationYear}
                    onChange={handleChange}
                    placeholder="Graduation Year"
                    min="1900"
                    max="2100"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Complete Registration</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
              Sign in instead
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
