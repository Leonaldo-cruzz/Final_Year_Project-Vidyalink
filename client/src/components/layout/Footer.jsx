import React from 'react';
import { GraduationCap } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 text-slate-400 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <GraduationCap className="w-5 h-5 text-indigo-400" />
          <span className="text-sm font-semibold text-slate-200">
            Vidya<span className="text-indigo-400">Link</span>
          </span>
          <span className="text-xs text-slate-500">• Academic Network</span>
        </div>

        <div className="text-xs text-slate-500">
          © {new Date().getFullYear()} VIDYALINK. Frontend Foundation Ready.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
