import React from 'react';
import { ArrowLeft, ArrowUpRight, Home } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="public-shell flex min-h-screen flex-col">
      <header className="border-b border-slate-800/80 px-4 py-5 sm:px-8"><Link to="/" className="flex items-center gap-3"><span className="brand-mark">V</span><span className="brand-wordmark">Vidya<span>Link</span></span></Link></header>
      <main className="flex flex-1 items-center justify-center px-6 py-20"><div className="max-w-xl"><p className="eyebrow">A missing page</p><p className="mt-4 font-serif text-8xl leading-none text-slate-700" style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}>404</p><h1 className="serif-heading mt-3 text-4xl text-[#f5f1e9]">This record isn't here.</h1><p className="mt-4 max-w-md text-sm leading-7 text-slate-400">The page may have moved, or your account may not have permission to open it.</p><div className="mt-8 flex flex-wrap gap-3"><button type="button" onClick={() => navigate(-1)} className="secondary-action rounded-md text-slate-200"><ArrowLeft className="mr-2 h-4 w-4" /> Go back</button><Link to="/" className="primary-action rounded-md"><Home className="mr-2 h-4 w-4" /> Home <ArrowUpRight className="ml-1.5 h-4 w-4" /></Link></div></div></main>
    </div>
  );
};

export default NotFound;
