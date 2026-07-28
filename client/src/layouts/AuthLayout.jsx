import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative">
      {/* Subtle ambient background glow */}
      <div className="absolute w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -top-10" />

      {/* Brand Header */}
      <div className="mb-6 text-center z-10">
        <Link to="/" className="inline-flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
            <GraduationCap className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold text-slate-100 tracking-tight">
            Vidya<span className="text-indigo-400">Link</span>
          </span>
        </Link>
        {title && <h2 className="text-xl font-bold text-white mt-4">{title}</h2>}
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>

      {/* Auth Form Card */}
      <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-2xl relative z-10">
        {children || <Outlet />}
      </div>

      {/* Back to Home Link */}
      <div className="mt-6 text-center text-xs text-slate-500 z-10">
        <Link to="/" className="hover:text-indigo-400 transition-colors">
          &larr; Back to Home
        </Link>
      </div>
    </div>
  );
};

export default AuthLayout;
