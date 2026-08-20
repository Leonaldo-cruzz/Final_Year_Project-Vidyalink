import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCheck, BellOff, ArrowRight, RefreshCw } from 'lucide-react';
import NotificationItem from './NotificationItem';
import { ROUTES } from '@/constants';

const NotificationDropdown = ({
  notifications = [],
  unreadCount = 0,
  loading = false,
  error = null,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onRefresh,
  onClose,
}) => {
  return (
    <div
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl z-50 overflow-hidden flex flex-col max-h-[540px] animate-in fade-in slide-in-from-top-2 duration-200"
      role="menu"
      aria-orientation="vertical"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white tracking-wide">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {unreadCount} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && onMarkAllRead && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/80 transition-all"
              title="Mark all notifications as read"
            >
              <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Mark all read</span>
            </button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
              title="Refresh notifications"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
        {loading && notifications.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-400">Loading notifications…</p>
          </div>
        ) : error ? (
          <div className="py-10 px-4 text-center space-y-2">
            <p className="text-xs text-red-400">{error}</p>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="text-xs font-semibold text-blue-400 hover:underline"
              >
                Try again
              </button>
            )}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-2.5">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
              <BellOff className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-200">No notifications yet</p>
            <p className="text-xs text-slate-500 max-w-[220px]">
              You're all caught up! Updates regarding verifications, recruitment, and mentorship will appear here.
            </p>
          </div>
        ) : (
          notifications.slice(0, 8).map((notification) => (
            <NotificationItem
              key={notification._id}
              notification={notification}
              onMarkRead={onMarkRead}
              onDelete={onDelete}
              onCloseDropdown={onClose}
              compact
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-slate-800/80 bg-slate-900/40 text-center">
        <Link
          to={ROUTES.NOTIFICATIONS || '/notifications'}
          onClick={onClose}
          className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-xl transition-all"
        >
          <span>View all notifications</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};

export default NotificationDropdown;
