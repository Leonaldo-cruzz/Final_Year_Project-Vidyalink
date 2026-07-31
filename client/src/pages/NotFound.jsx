import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, AlertTriangle } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #020617 0%, #0a0f2e 50%, #020617 100%)' }}
    >
      {/* Background glows */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full bg-red-600/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-blue-600/5 blur-3xl pointer-events-none" />

      <div className="text-center px-6 relative z-10 fade-in-up max-w-lg">
        {/* 404 Icon */}
        <div className="w-24 h-24 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-8">
          <AlertTriangle className="w-12 h-12 text-red-400" />
        </div>

        {/* Number */}
        <div className="text-8xl font-black mb-4" style={{
          background: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          404
        </div>

        <h1 className="text-2xl font-extrabold text-white mb-3">Page Not Found</h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          The page you're looking for doesn't exist or you don't have permission to access it.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-all text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/25 transition-all text-sm font-semibold"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
