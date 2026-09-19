import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ArrowUpRight, Check } from 'lucide-react';

const AuthLayout = ({ children, title, subtitle }) => (
  <div className="auth-shell min-h-screen bg-[#f5f1e9] text-[#111820] lg:grid lg:grid-cols-[minmax(320px,0.85fr)_minmax(460px,1.15fr)]">
    <aside className="hidden flex-col justify-between bg-[#111820] p-8 text-[#f5f1e9] lg:flex xl:p-12">
      <Link to="/" className="flex items-center gap-3" aria-label="VidyaLink home">
        <span className="brand-mark">V</span><span className="brand-wordmark">Vidya<span>Link</span></span>
      </Link>
      <div className="max-w-md">
        <p className="eyebrow">A better academic signal</p>
        <h1 className="mt-4 font-serif text-5xl leading-[1.02] tracking-tight text-[#f5f1e9]" style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}>Make the work visible.</h1>
        <p className="mt-5 text-sm leading-7 text-slate-400">VidyaLink keeps projects, proof, guidance, and opportunity in one shared record — so every introduction starts with something real.</p>
        <div className="mt-8 space-y-3 text-sm text-slate-300">
          {['Evidence-led profiles', 'Faculty-verified progress', 'Clearer career conversations'].map((item) => <p key={item} className="flex items-center gap-3"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-300/15 text-orange-200"><Check className="h-3 w-3" /></span>{item}</p>)}
        </div>
      </div>
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-bold text-orange-200 hover:text-orange-100">Back to VidyaLink <ArrowUpRight className="h-4 w-4" /></Link>
    </aside>
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-8">
      <div className="mb-8 flex w-full max-w-xl items-center justify-between lg:hidden">
        <Link to="/" className="flex items-center gap-3"><span className="brand-mark">V</span><span className="text-base font-extrabold tracking-tight">VidyaLink</span></Link>
        <Link to="/" className="text-sm font-bold text-[#a9603b]">Home</Link>
      </div>
      <div className="w-full max-w-xl">
        {(title || subtitle) && <div className="mb-6"><p className="eyebrow">VidyaLink account</p>{title && <h2 className="page-title mt-2">{title}</h2>}{subtitle && <p className="mt-2 text-sm text-[#6d767c]">{subtitle}</p>}</div>}
        <div className="paper-panel rounded-xl p-6 shadow-[0_18px_42px_rgb(17_24_32_/_0.12)] sm:p-8">{children || <Outlet />}</div>
        <p className="mt-5 text-center text-xs text-[#6d767c]">Your account data stays within your institution's VidyaLink workspace.</p>
      </div>
    </main>
  </div>
);

export default AuthLayout;
