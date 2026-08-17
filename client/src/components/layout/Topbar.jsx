import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Sun, Moon, ChevronDown, LogOut, UserCircle, Settings, X, Check, CheckCircle2, Clock } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { ROUTES, ROLE_COLORS, ROLE_LABELS } from '@/constants';
import { getInitials, formatDate } from '@/utils/formatters';
import notificationService from '@/services/notificationService';

const Topbar = ({ theme, onThemeToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const notificationRef = useRef(null);
  
  const roleColor = user?.role ? ROLE_COLORS[user.role] : ROLE_COLORS['student'];

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const data = await notificationService.getMyNotifications();
      setNotifications(data.data || []);
      setUnreadCount(data.data?.filter(n => !n.isRead).length || 0);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
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

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notificationRef]);


  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800/70 bg-slate-950/90 backdrop-blur-md">
      {/* Left: Page title placeholder (breadcrumb is inside content) */}
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
          {theme === 'dark'
            ? <Sun className="w-4 h-4" />
            : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setNotificationsOpen(v => !v)}
            className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-slate-950" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-40 overflow-hidden fade-in flex flex-col max-h-[80vh]">
              <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/90 backdrop-blur">
                <h3 className="font-bold text-white text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllAsRead}
                    className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="overflow-y-auto overflow-x-hidden flex-1 p-2 space-y-1">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-sm">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n._id} 
                      className={`relative p-3 rounded-xl border ${n.isRead ? 'border-transparent bg-transparent hover:bg-slate-800/50' : 'border-slate-800 bg-slate-800/30'} transition-colors group`}
                    >
                      <div className="flex gap-3">
                        <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${n.isRead ? 'bg-slate-800 text-slate-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {n.type === 'verification' ? <CheckCircle2 className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                          <p className={`text-sm ${n.isRead ? 'text-slate-300' : 'text-slate-100 font-medium'}`}>{n.title}</p>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-slate-600 mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatDate(n.createdAt)}
                          </p>
                        </div>
                      </div>
                      {!n.isRead && (
                        <button 
                          onClick={() => handleMarkAsRead(n._id)}
                          className="absolute top-3 right-3 p-1 text-slate-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all rounded"
                          title="Mark as read"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-slate-800 mx-1" />

        {/* Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
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
              {/* Backdrop */}
              <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-40 overflow-hidden fade-in">
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
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
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
