import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell, Sun, Moon, ChevronDown, LogOut, UserCircle, Settings,
  CheckCircle2, Award, MessageSquare, Share2, CalendarCheck, ExternalLink,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { ROUTES, ROLE_COLORS, ROLE_LABELS } from '@/constants';
import { getInitials } from '@/utils/formatters';
import notificationService from '@/services/notificationService';

const Topbar = ({ theme, onThemeToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const roleColor = user?.role ? ROLE_COLORS[user.role] : ROLE_COLORS['student'];

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const data = await notificationService.getMyNotifications({ limit: 10 });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Non-blocking
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // Non-blocking
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await notificationService.markAsRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // Non-blocking
      }
    }
    setNotifOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate(ROUTES.LOGIN);
    } finally {
      setLoggingOut(false);
    }
  };

  const getNotifIcon = (type) => {
    if (type?.includes('MENTORSHIP')) return <MessageSquare className="w-3.5 h-3.5 text-amber-400" />;
    if (type?.includes('ENDORSEMENT')) return <Award className="w-3.5 h-3.5 text-purple-400" />;
    if (type?.includes('REFERRAL')) return <Share2 className="w-3.5 h-3.5 text-emerald-400" />;
    if (type?.includes('INTERVIEW')) return <CalendarCheck className="w-3.5 h-3.5 text-blue-400" />;
    return <Bell className="w-3.5 h-3.5 text-blue-400" />;
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800/70 bg-slate-950/90 backdrop-blur-md">
      {/* Left: Page title */}
      <div className="flex items-center gap-2">
        <span className="text-slate-300 font-semibold text-sm hidden sm:block">
          {ROLE_LABELS[user?.role] || ''} Portal
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={onThemeToggle}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen((v) => !v);
              setDropdownOpen(false);
            }}
            className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center ring-2 ring-slate-950">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-40 overflow-hidden fade-in">
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-semibold text-amber-400 hover:text-amber-300"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3.5 hover:bg-slate-800/60 cursor-pointer transition-colors flex items-start gap-3 ${
                          !notif.isRead ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        <div className="mt-0.5 p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                          {getNotifIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-200">{notif.title}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{notif.message}</p>
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-slate-800 mx-1" />

        {/* Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setDropdownOpen((v) => !v);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-slate-800/70 transition-all"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${roleColor.bg} ${roleColor.text} border ${roleColor.border}`}>
              {getInitials(user?.fullName)}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-slate-100 leading-none">{user?.fullName}</p>
              <p className={`text-[10px] uppercase tracking-wider font-bold ${roleColor.text} leading-none mt-0.5`}>
                {user?.role}
              </p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-40 overflow-hidden fade-in">
                <div className="px-4 py-3 border-b border-slate-800">
                  <p className="text-sm font-bold text-white truncate">{user?.fullName}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
                <div className="py-1.5 px-1.5 space-y-0.5">
                  <Link
                    to={user?.role === 'alumni' ? ROUTES.ALUMNI_PROFILE : ROUTES.PROFILE}
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                  >
                    <UserCircle className="w-4 h-4" />
                    <span>My Profile</span>
                  </Link>
                </div>
                <div className="py-1.5 px-1.5 border-t border-slate-800">
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{loggingOut ? 'Signing out…' : 'Sign Out'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
