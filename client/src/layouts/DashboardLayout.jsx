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

  const sidebarWidth = collapsed ? 72 : 260;

  return (
    <div className="min-h-screen flex relative">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar (fixed) */}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
      />

      {/* Main area (offset by sidebar width) */}
      <div
        className="flex-1 flex flex-col min-h-screen sidebar-transition"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        {/* Topbar (sticky) */}
        <div className="sticky top-0 z-20">
          <Topbar theme={theme} onThemeToggle={toggleTheme} />
        </div>

        {/* Content */}
        <main className="flex-1 p-6 lg:p-8 content-scroll">
          <Breadcrumb />
          <div className="fade-in-up">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="py-4 px-6 border-t border-slate-800/50 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} VidyaLink — AI-Powered Academic Collaboration Platform
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
