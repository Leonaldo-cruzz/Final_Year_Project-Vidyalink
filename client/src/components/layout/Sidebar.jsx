import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, UserCircle, Users,
  PlusSquare, Briefcase, Award, ChevronLeft, ChevronRight, Zap, LogOut, FileText,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { NAV_ITEMS, ROLE_COLORS } from '@/constants';
import { getInitials } from '@/utils/formatters';

// Icon map from string name to Lucide component
const ICON_MAP = {
  LayoutDashboard, FolderKanban, UserCircle, Users, PlusSquare, Briefcase, Award, FileText,
};

const Sidebar = ({ collapsed, onToggle }) => {
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
        bg-slate-950 border-r border-slate-800/70
        sidebar-transition
        ${collapsed ? 'w-[72px]' : 'w-[260px]'}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 border-b border-slate-800/70 px-4 flex-shrink-0 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-white font-extrabold text-lg tracking-tight slide-in-left">
            VidyaLink
          </span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map(({ label, icon, path }) => {
          const IconComponent = ICON_MAP[icon] || LayoutDashboard;
          return (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-150 group relative
                ${isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/25'
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
            flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
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
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
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
