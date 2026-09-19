import React from 'react';
import { ArrowUpRight } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 py-10 text-slate-400">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="brand-mark" aria-hidden="true">V</span>
            <span className="brand-wordmark">Vidya<span>Link</span></span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">A shared place for students, faculty, alumni, and recruiters to work from evidence.</p>
        </div>
        <div className="flex flex-col gap-2 text-sm lg:items-end">
          <a href="#features" className="inline-flex items-center gap-1 font-semibold text-slate-300 hover:text-orange-200">Explore the platform <ArrowUpRight className="h-3.5 w-3.5" /></a>
          <span className="text-xs text-slate-600">© {new Date().getFullYear()} VidyaLink</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
