import React from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { AlertTriangle, Home } from 'lucide-react';

const NotFound = () => {
  return (
    <MainLayout>
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-slate-900/60 border border-slate-800 rounded-2xl p-8">
          <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-400">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <h1 className="text-4xl font-extrabold text-white mb-2">404</h1>
          <h2 className="text-lg font-bold text-slate-200 mb-3">Page Not Found</h2>
          <p className="text-xs text-slate-400 mb-6">
            The page you are looking for does not exist or has been moved.
          </p>

          <Link
            to="/"
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
};

export default NotFound;
