import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell, Sun, Moon, ChevronDown, LogOut, UserCircle, Menu,
  Award, Send, Calendar, Users, Share2, CheckCheck, Loader2
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { ROUTES, ROLE_COLORS, ROLE_LABELS } from '@/constants';
import { getInitials } from '@/utils/formatters';
import notificationService from '@/services/notificationService';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'verification':
      return <Award className="w-4 h-4 text-emerald-400 shrink-0" />;
    case 'interview':
      return <Calendar className="w-4 h-4 text-purple-400 shrink-0" />;
    case 'mentorship':
      return <Users className="w-4 h-4 text-amber-400 shrink-0" />;
    case 'referral':
      return <Share2 className="w-4 h-4 text-blue-400 shrink-0" />;
    case 'application':
      return <Send className="w-4 h-4 text-orange-400 shrink-0" />;
    default:
      return <Bell className="w-4 h-4 text-slate-400 shrink-0" />;
  }
};

const Topbar = ({ theme, onThemeToggle, onMenuToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const roleColor = user?.role ? ROLE_COLORS[user.role] : ROLE_COLORS['student'];

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const data = await notificationService.getUnreadCount();
      setUnreadCount(data?.unreadCount || 0);
    } catch {
      // Graceful fallback on network glitch
    }
  }, [user]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingNotifications(true);
      const data = await notificationService.getNotifications({ limit: 10 });
      setNotifications(data?.notifications || []);
      setUnreadCount(data?.unreadCount || 0);
    } catch {
      // Empty list on error
    } finally {
      setLoadingNotifications(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (notificationsOpen) {
      loadNotifications();
    }
  }, [notificationsOpen, loadNotifications]);

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.read) {
        await notificationService.markAsRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
      // Continue navigation even if marking read fails
    }

    setNotificationsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // Silent error
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

  return (
    <header className="h-[68px] flex items-center justify-between px-4 sm:px-6 border-b border-slate-800/70 bg-slate-950">
      {/* Left: Page title */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMenuToggle}
          className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-slate-300 font-semibold text-sm hidden sm:block">
          {ROLE_LABELS[user?.role] || ''} Portal
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={onThemeToggle}
          className="w-9 h-9 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all"
          aria-label="Toggle theme"
        >
          {theme === 'dark'
            ? <Sun className="w-4 h-4" />
            : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen((value) => !value)}
            className="relative flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition-all hover:bg-slate-800 hover:text-slate-200"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            aria-expanded={notificationsOpen}
            aria-controls="notifications-panel"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white shadow-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setNotificationsOpen(false)} aria-hidden="true" />
              <div
                id="notifications-panel"
                role="region"
                aria-label="Notifications"
                className="absolute right-0 top-full z-40 mt-2 w-80 sm:w-96 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden fade-in"
              >
                {/* Panel Header */}
                <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3 bg-slate-950/60">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white">Notifications</p>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[11px] font-semibold text-orange-300">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-orange-300 transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/50">
                  {loadingNotifications ? (
                    <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-orange-300" /> Loading notifications…
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-6 text-center">
                      <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                      <p className="text-xs leading-relaxed text-slate-400">
                        No new notifications. Connected verification, application, and mentorship events will appear here.
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <button
                        key={notif._id}
                        type="button"
                        onClick={() => handleNotificationClick(notif)}
                        className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors hover:bg-slate-800/60 ${
                          notif.read ? 'bg-transparent' : 'bg-slate-800/30'
                        }`}
                      >
                        <div className="mt-0.5 p-1.5 rounded-lg bg-slate-800/90 border border-slate-700/60">
                          {getNotificationIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className={`text-xs font-semibold truncate ${notif.read ? 'text-slate-300' : 'text-white font-bold'}`}>
                              {notif.title}
                            </p>
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" aria-label="Unread" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                            {notif.message}
                          </p>
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            {new Date(notif.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </button>
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
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-slate-800/70 transition-all"
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
              {/* Backdrop */}
              <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-56 rounded-lg bg-slate-900 border border-slate-800 shadow-xl z-40 overflow-hidden fade-in">
                <div className="px-4 py-3 border-b border-slate-800">
                  <p className="text-sm font-bold text-white truncate">{user?.fullName}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
                <div className="py-1.5 px-1.5 space-y-0.5">
                  <Link
                    to={ROUTES.PROFILE}
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
