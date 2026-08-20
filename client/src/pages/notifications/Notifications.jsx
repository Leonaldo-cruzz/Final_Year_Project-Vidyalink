import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Briefcase,
  Calendar,
  Users,
  Award,
  Sparkles,
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import NotificationItem from '@/components/notifications/NotificationItem';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} from '@/services/notificationService';

// ── Category Filters ──────────────────────────────────────────────────────────

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All Categories', icon: Filter, types: null },
  {
    id: 'verification',
    label: 'Verification',
    icon: ShieldCheck,
    types: 'VERIFICATION_SUBMITTED,VERIFICATION_APPROVED,VERIFICATION_REJECTED,CHANGES_REQUESTED',
  },
  {
    id: 'recruitment',
    label: 'Recruitment',
    icon: Briefcase,
    types: 'SHORTLISTED,INTERVIEW_COMPLETED',
  },
  {
    id: 'interview',
    label: 'Interviews',
    icon: Calendar,
    types: 'INTERVIEW_SCHEDULED,INTERVIEW_RESCHEDULED,INTERVIEW_CANCELLED,INTERVIEW_COMPLETED',
  },
  {
    id: 'mentorship',
    label: 'Mentorship',
    icon: Users,
    types: 'MENTORSHIP_REQUEST,MENTORSHIP_ACCEPTED,MENTORSHIP_DECLINED,MENTORSHIP_COMPLETED',
  },
  {
    id: 'referral',
    label: 'Endorsements & Referrals',
    icon: Award,
    types: 'SKILL_ENDORSEMENT,REFERRAL_CREATED,REFERRAL_UPDATED',
  },
  {
    id: 'system',
    label: 'System',
    icon: Sparkles,
    types: 'SYSTEM,PORTFOLIO_UPDATED',
  },
];

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
    hasPrevPage: false,
    hasNextPage: false,
  });
  const [unreadCount, setUnreadCount] = useState(0);

  // Filters
  const [readFilter, setReadFilter] = useState('all'); // 'all' | 'unread' | 'read'
  const [categoryFilter, setCategoryFilter] = useState('all');

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clearingAll, setClearingAll] = useState(false);

  // ── Fetch Notifications ───────────────────────────────────────────────────
  const fetchPageNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let isReadParam;
      if (readFilter === 'unread') isReadParam = false;
      if (readFilter === 'read') isReadParam = true;

      const activeCat = CATEGORY_FILTERS.find((c) => c.id === categoryFilter);
      const typeParam = activeCat?.types || undefined;

      const data = await getNotifications({
        page: pagination.page,
        limit: pagination.limit,
        isRead: isReadParam,
        type: typeParam,
      });

      setNotifications(data.notifications || []);
      if (data.pagination) {
        setPagination((prev) => ({ ...prev, ...data.pagination }));
      }
      if (typeof data.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, readFilter, categoryFilter]);

  useEffect(() => {
    fetchPageNotifications();
  }, [fetchPageNotifications]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleMarkRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Handled silently
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Handled silently
    }
  };

  const handleDelete = async (id) => {
    try {
      const target = notifications.find((n) => n._id === id);
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (target && !target.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    } catch {
      // Handled silently
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to clear all notifications?')) return;
    setClearingAll(true);
    try {
      await deleteAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
      setPagination((prev) => ({ ...prev, total: 0, totalPages: 1 }));
    } catch {
      // Handled silently
    } finally {
      setClearingAll(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span className="p-2 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Bell className="w-6 h-6" />
              </span>
              Notifications
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Stay up to date with verification requests, interviews, mentorship, and updates.
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Mark all read</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={clearingAll}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-red-500/10 text-slate-300 hover:text-red-400 border border-slate-800 transition-all disabled:opacity-50"
                title="Delete all notifications"
              >
                <Trash2 className="w-4 h-4" />
                <span>{clearingAll ? 'Clearing…' : 'Clear all'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={fetchPageNotifications}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-2 rounded-2xl bg-slate-950/80 border border-slate-800/80 shadow-sm backdrop-blur-md">
          {/* Read State Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setReadFilter('all');
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                readFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => {
                setReadFilter('unread');
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                readFilter === 'unread'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setReadFilter('read');
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                readFilter === 'read'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Read
            </button>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {CATEGORY_FILTERS.map((cat) => {
              const Icon = cat.icon;
              const isSelected = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(cat.id);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
                      : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications Content */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <p className="text-sm font-medium text-slate-400">Loading your notifications…</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 space-y-3">
              <p className="text-sm font-semibold">{error}</p>
              <button
                type="button"
                onClick={fetchPageNotifications}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-all"
              >
                Retry
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-20 px-4 text-center rounded-3xl bg-slate-950/60 border border-slate-800/80 flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-inner">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">No notifications found</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                {readFilter === 'unread'
                  ? 'You have read all notifications in this category.'
                  : 'There are no notifications matching your current filters.'}
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-800/70">
            <p className="text-xs text-slate-400">
              Showing page <span className="font-semibold text-white">{pagination.page}</span> of{' '}
              <span className="font-semibold text-white">{pagination.totalPages}</span> ({pagination.total} total)
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!pagination.hasPrevPage}
                onClick={() => handlePageChange(pagination.page - 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                type="button"
                disabled={!pagination.hasNextPage}
                onClick={() => handlePageChange(pagination.page + 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Notifications;
