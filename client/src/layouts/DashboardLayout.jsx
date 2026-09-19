import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { getSavedTheme, saveTheme, applyTheme } from '@/utils/storage';

const DashboardLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(() => getSavedTheme());

  // Apply theme on mount and change
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    saveTheme(next);
  };

  const sidebarWidth = collapsed ? 72 : 252;

  return (
    <div className="min-h-screen flex relative bg-slate-950 text-slate-100">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      {/* Sidebar (fixed) */}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* Main area (offset by sidebar width) */}
      <div
        className="dashboard-main flex-1 flex flex-col min-h-screen sidebar-transition"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        {/* Topbar (sticky) */}
        <div className="sticky top-0 z-20">
          <Topbar theme={theme} onThemeToggle={toggleTheme} onMenuToggle={() => setMobileOpen((v) => !v)} />
        </div>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 content-scroll">
          <Breadcrumb />
          <div className="fade-in-up">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="py-4 px-6 border-t border-slate-800/50 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} VidyaLink — Evidence-led academic collaboration
        </footer>
      </div>
    </div>
  );
};


export default DashboardLayout;
