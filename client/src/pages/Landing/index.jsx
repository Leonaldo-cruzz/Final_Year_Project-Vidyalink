import React from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { GraduationCap, ArrowRight, ShieldCheck, Users, Zap } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const Landing = () => {
  const { isAuthenticated } = useAuth();

  return (
    <MainLayout>
      <div className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3.5 py-1 mb-6">
          <GraduationCap className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-indigo-300">
            VidyaLink Frontend Foundation
          </span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight max-w-4xl mx-auto leading-tight">
          Unified Academic Network for{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300">
            Higher Education
          </span>
        </h1>

        <p className="mt-6 text-slate-400 text-lg max-w-2xl mx-auto">
          Connecting students, faculty, alumni, and recruiters under one secure platform.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all flex items-center space-x-2 shadow-lg shadow-indigo-600/25"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all flex items-center space-x-2 shadow-lg shadow-indigo-600/25"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold text-sm transition-all"
              >
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <ShieldCheck className="w-8 h-8 text-indigo-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Secure Routing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              React Router integration with ProtectedRoute wrappers and AuthContext foundation.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <Users className="w-8 h-8 text-indigo-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Multi-Role Architecture</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Designed for Student, Faculty, Alumni, and Recruiter onboarding flows.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <Zap className="w-8 h-8 text-indigo-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Modern Tech Stack</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Powered by React 19, Vite, Tailwind CSS, Axios client, React Hook Form, and Zod.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Landing;
