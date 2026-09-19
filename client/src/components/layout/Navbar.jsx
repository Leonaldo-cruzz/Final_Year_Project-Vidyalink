import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, LogIn, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ROLE_ROUTE_MAP, ROUTES } from '@/constants';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);
  const handleLogout = async () => {
    await logout();
    closeMobile();
    navigate(ROUTES.LOGIN);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to={ROUTES.HOME} className="flex items-center gap-3" aria-label="VidyaLink home">
          <span className="brand-mark" aria-hidden="true">V</span>
          <span className="brand-wordmark">Vidya<span>Link</span></span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Public navigation">
          <a href="#features" className="text-sm font-semibold text-slate-400 transition-colors hover:text-orange-200">What it connects</a>
          <a href="#roles" className="text-sm font-semibold text-slate-400 transition-colors hover:text-orange-200">For campus roles</a>
          {isAuthenticated ? (
            <div className="flex items-center gap-3 border-l border-slate-800 pl-6">
              <Link to={ROLE_ROUTE_MAP[user?.role] || ROUTES.STUDENT_DASHBOARD} className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-200 hover:text-orange-100">
                Open workspace <ArrowUpRight className="h-4 w-4" />
              </Link>
              <button type="button" onClick={handleLogout} className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:border-red-400/50 hover:text-red-300">
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 border-l border-slate-800 pl-6">
              <Link to={ROUTES.LOGIN} className="text-sm font-bold text-slate-300 hover:text-white">Sign in</Link>
              <Link to={ROUTES.REGISTER} className="primary-action rounded-md">Create account <ArrowUpRight className="ml-1.5 h-4 w-4" /></Link>
            </div>
          )}
        </nav>

        <button type="button" onClick={() => setMobileOpen((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800 md:hidden" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="border-t border-slate-800 bg-slate-950 px-4 py-5 md:hidden" aria-label="Mobile navigation">
          <div className="mx-auto flex max-w-7xl flex-col gap-4">
            <a href="#features" onClick={closeMobile} className="text-sm font-semibold text-slate-300">What it connects</a>
            <a href="#roles" onClick={closeMobile} className="text-sm font-semibold text-slate-300">For campus roles</a>
            {isAuthenticated ? (
              <>
                <Link to={ROLE_ROUTE_MAP[user?.role] || ROUTES.STUDENT_DASHBOARD} onClick={closeMobile} className="inline-flex items-center gap-2 text-sm font-bold text-orange-200"><ArrowUpRight className="h-4 w-4" /> Open workspace</Link>
                <button type="button" onClick={handleLogout} className="inline-flex items-center gap-2 text-left text-sm font-bold text-red-300"><LogOut className="h-4 w-4" /> Sign out</button>
              </>
            ) : (
              <div className="flex gap-3 border-t border-slate-800 pt-4">
                <Link to={ROUTES.LOGIN} onClick={closeMobile} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-700 py-3 text-sm font-bold text-slate-200"><LogIn className="h-4 w-4" /> Sign in</Link>
                <Link to={ROUTES.REGISTER} onClick={closeMobile} className="primary-action flex-1 rounded-md">Create account</Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};

export default Navbar;
