import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-4 md:col-span-2">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                V
              </div>
              <span className="text-xl font-bold text-slate-100">
                Vidya<span className="text-indigo-400">Link</span>
              </span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              The unified academic platform connecting students, faculty, alumni, and recruiters to bridge education and career opportunities.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/" className="hover:text-indigo-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-indigo-400 transition-colors">
                  Student Registration
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-indigo-400 transition-colors">
                  Faculty & Alumni Portal
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-indigo-400 transition-colors">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">
              Security & Compliance
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>JWT Authentication</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Role-Based Access (RBAC)</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>HTTP-Only Refresh Cookies</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-900/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} VidyaLink Academic Network. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">Production-Ready Authentication Engine</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
