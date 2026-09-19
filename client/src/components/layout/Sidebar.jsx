import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, UserCircle, Users, Code2, Brain,
  PlusSquare, Briefcase, Award, ChevronLeft, ChevronRight, LogOut, FileText, Send, X,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { NAV_ITEMS, ROLE_COLORS } from '@/constants';
import { getInitials } from '@/utils/formatters';

// Icon map from string name to Lucide component
const ICON_MAP = {
  LayoutDashboard, FolderKanban, UserCircle, Users, Code2, Brain, PlusSquare, Briefcase, Award, FileText, Send,
};

const Sidebar = ({ collapsed, onToggle, mobileOpen = false, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = (user?.role ? NAV_ITEMS[user.role] : []) || [];
  const roleColor = user?.role ? ROLE_COLORS[user.role] : ROLE_COLORS['student'];

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <aside
      className={`
        fixed top-0 left-0 h-full z-40 flex flex-col
        app-sidebar bg-slate-950 border-r border-slate-800/70
        sidebar-transition
        ${collapsed ? 'lg:w-[72px]' : 'lg:w-[252px]'}
        w-[252px]
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
      aria-label="Primary navigation"
    >
      {/* Logo */}
      <div className={`flex items-center h-[68px] border-b border-slate-800/70 px-4 flex-shrink-0 ${collapsed ? 'lg:justify-center' : 'gap-3'}`}>
        <div className="brand-mark flex-shrink-0" aria-hidden="true">
          <span className="text-sm font-extrabold">V</span>
        </div>
        {!collapsed && (
          <span className="brand-wordmark slide-in-left">
            VidyaLink
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1" aria-label="Workspace">
        {!collapsed && <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Workspace</p>}
        {navItems.map(({ label, icon, path }) => {
          const IconComponent = ICON_MAP[icon] || LayoutDashboard;
          return (
            <NavLink
              key={path}
              to={path}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150 group relative
                ${isActive
                  ? 'bg-orange-400/10 text-orange-300 border border-orange-300/25'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'}
              `}
            >
              <IconComponent className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}

              {/* Tooltip when collapsed */}
              {collapsed && (
                <div className="
                  absolute left-full ml-2 px-2.5 py-1.5 rounded-lg
                  bg-slate-800 border border-slate-700 text-white text-xs font-medium
                  opacity-0 pointer-events-none
                  group-hover:opacity-100 whitespace-nowrap z-50
                  transition-opacity duration-150
                ">
                  {label}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="flex-shrink-0 border-t border-slate-800/70 p-3 space-y-2">
        {/* User card */}
        <div className={`flex items-center gap-3 px-2 py-2 rounded-xl ${collapsed ? 'justify-center' : ''}`}>
          <div className={`
            flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold
            ${roleColor.bg} ${roleColor.text} border ${roleColor.border}
          `}>
            {getInitials(user?.fullName)}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">{user?.fullName}</p>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${roleColor.text}`}>{user?.role}</p>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
            text-slate-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20
            border border-transparent transition-all duration-150
            disabled:opacity-50
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>{loggingOut ? 'Signing out…' : 'Sign Out'}</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="
          absolute -right-3 top-20 w-6 h-6 rounded-full
          bg-slate-800 border border-slate-700 text-slate-400 hover:text-white
          flex items-center justify-center shadow-lg
          transition-colors duration-150 z-50
        "
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3" />
          : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
};

export default Sidebar;
