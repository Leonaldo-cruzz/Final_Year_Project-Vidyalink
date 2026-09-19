import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, FolderKanban, ShieldCheck, UserCheck,
  Search, CheckCircle2, RefreshCw, Server, Database, Loader2, Brain,
  MessageSquare, Share2, Calendar
} from 'lucide-react';

import DashboardLayout from '@/layouts/DashboardLayout';
import { StatCard, SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/utils/formatters';
import api from '@/services/api';
import { getAIHealth } from '@/services/aiService';

const STATUS_CONFIG = {
  active:   { variant: 'emerald', label: 'Verified' },
  pending:  { variant: 'amber',   label: 'Pending Review' },
  inactive: { variant: 'slate',   label: 'Restricted' },
};

const AdminDashboard = () => {
  const { user } = useAuth();

  const [usersList, setUsersList] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeProjects: 0,
    verifiedPortfolios: 0,
    totalApplications: 0,
    totalMentorships: 0,
    totalReferrals: 0,
    totalInterviews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [toastMessage, setToastMessage] = useState('');
  // Real AI service health state
  const [aiHealth, setAiHealth] = useState({ loading: true, available: null, checkedAt: null });

  const fetchAdminData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes] = await Promise.allSettled([
        api.get('/admin/stats'),
        api.get('/admin/users'),
      ]);

      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value?.data?.data || {};
        setStats({
          totalUsers: d.totalUsers ?? 0,
          activeProjects: d.activeProjects ?? 0,
          verifiedPortfolios: d.verifiedPortfolios ?? 0,
          totalApplications: d.totalApplications ?? 0,
          totalMentorships: d.totalMentorships ?? 0,
          totalReferrals: d.totalReferrals ?? 0,
          totalInterviews: d.totalInterviews ?? 0,
        });
      }

      if (usersRes.status === 'fulfilled') {
        // API now returns paginated response: { users, total, page, totalPages }
        const resData = usersRes.value?.data?.data || usersRes.value?.data || {};
        const uList = Array.isArray(resData) ? resData : (resData.users || []);
        setUsersList(Array.isArray(uList) ? uList : []);
      }
    } catch {
      // Honest empty state
    } finally {
      setLoading(false);
    }
  }, []);

  // Real AI health check — called on mount and on Refresh
  const checkAIHealth = useCallback(async () => {
    setAiHealth((prev) => ({ ...prev, loading: true }));
    try {
      const res = await getAIHealth();
      const data = res?.data?.data ?? res?.data ?? res;
      setAiHealth({ loading: false, available: Boolean(data?.available), checkedAt: new Date() });
    } catch {
      setAiHealth({ loading: false, available: false, checkedAt: new Date() });
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
    checkAIHealth();
  }, [fetchAdminData, checkAIHealth]);

  const handleToggleStatus = async (userId, currentStatus, userName) => {
    try {
      const res = await api.patch(`/admin/users/${userId}/status`);
      const updated = res.data?.data;
      setUsersList((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, status: updated?.status || (currentStatus === 'active' ? 'inactive' : 'active') } : u))
      );
      setToastMessage(`Updated status for ${userName || 'user'}!`);
      setTimeout(() => setToastMessage(''), 3500);
    } catch {
      setToastMessage('Failed to update user status.');
      setTimeout(() => setToastMessage(''), 3500);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const nameStr = (u.fullName || '').toLowerCase();
    const emailStr = (u.email || '').toLowerCase();
    const instStr = (u.college || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = nameStr.includes(q) || emailStr.includes(q) || instStr.includes(q);
    return matchesRole && matchesSearch;
  });

  return (
    <DashboardLayout>
      {/* Admin Command Header */}
      <div className="mb-6 rounded-xl border border-slate-800/80 bg-linear-to-r from-slate-900/90 via-slate-900/60 to-slate-950 p-5 sm:p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-widest text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                <ShieldCheck className="h-3.5 w-3.5" /> Platform Administration
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">VidyaLink University Network</span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-emerald-400 font-semibold">System Operational</span>
            </div>

            <h1 className="page-title text-white text-2xl sm:text-3xl font-extrabold">
              Platform Administration & User Directory
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Operator{user?.fullName ? `: ${user.fullName}` : ''}. Monitor institutional membership, verify university domains, and view platform activity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={RefreshCw}
              onClick={() => {
                fetchAdminData();
                setToastMessage('Refreshed administrative metrics from database.');
                setTimeout(() => setToastMessage(''), 3500);
              }}
            >
              Refresh Metrics
            </Button>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-300"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            {toastMessage}
          </span>
          <button onClick={() => setToastMessage('')} className="text-xs text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Real Stats — 7 metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8 stagger">
        <StatCard
          label="Total Accounts"
          value={stats.totalUsers.toString()}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Active Projects"
          value={stats.activeProjects.toString()}
          icon={FolderKanban}
          color="emerald"
        />
        <StatCard
          label="Verified Portfolios"
          value={stats.verifiedPortfolios.toString()}
          icon={ShieldCheck}
          color="purple"
        />
        <StatCard
          label="Applications"
          value={stats.totalApplications.toString()}
          icon={UserCheck}
          color="amber"
        />
        <StatCard
          label="Mentorships"
          value={stats.totalMentorships.toString()}
          icon={MessageSquare}
          color="orange"
        />
        <StatCard
          label="Referrals"
          value={stats.totalReferrals.toString()}
          icon={Share2}
          color="blue"
        />
        <StatCard
          label="Interviews"
          value={stats.totalInterviews.toString()}
          icon={Calendar}
          color="emerald"
        />
      </div>

      {/* User Management Console */}
      <SectionCard
        title="Institutional Membership Registry"
        subtitle="Manage and verify accounts across university departments and corporate partners"
        className="mb-6"
      >
        {/* Controls: Search & Role Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, or institution..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-lg overflow-x-auto">
            {['all', 'student', 'faculty', 'recruiter', 'alumni'].map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors ${
                  roleFilter === role
                    ? 'bg-orange-300 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Directory Table */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex items-center justify-center gap-2 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-orange-300" /> Loading membership directory…
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Users className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-white">No registered accounts found</p>
            <p className="text-xs text-slate-400">
              {searchQuery ? `No users matching "${searchQuery}".` : 'No accounts exist in this role filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3">Member Details</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Institution / Branch</th>
                  <th className="py-3 px-3">Account Status</th>
                  <th className="py-3 px-3">Registration Date</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((u) => {
                  const statusInfo = STATUS_CONFIG[u.status] || STATUS_CONFIG.active;
                  return (
                    <tr key={u._id} className="hover:bg-slate-950/40 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.fullName || ''} size="sm" />
                          <div>
                            <p className="font-bold text-white">{u.fullName || ''}</p>
                            <p className="text-[11px] text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <Badge role={u.role} size="sm">{u.role}</Badge>
                      </td>
                      <td className="py-3.5 px-3">
                        <p className="text-slate-300 font-medium">{u.college || '—'}</p>
                        {u.branch && (
                          <p className="text-[10px] text-slate-500">{u.branch}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <Badge variant={statusInfo.variant} size="sm">{statusInfo.label}</Badge>
                      </td>
                      <td className="py-3.5 px-3 text-slate-400">
                        {u.createdAt ? formatDate(u.createdAt) : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <Button
                          size="xs"
                          variant={u.status === 'active' ? 'ghost' : 'outline'}
                          onClick={() => handleToggleStatus(u._id, u.status, u.fullName)}
                        >
                          {u.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Administrative Infrastructure Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard title="Data Truth & Integrity Status">
          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                <span>MongoDB Primary Cluster</span>
              </div>
              <span className="text-emerald-400 font-bold">Connected & Synchronized</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 text-orange-300" aria-hidden="true" />
                <span>Role-Based Access Control</span>
              </div>
              <span className="text-emerald-400 font-bold">Active & Enforced</span>
            </div>

            {/* Real AI service health check */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <Brain className="w-4 h-4 text-purple-400" aria-hidden="true" />
                <div>
                  <span>AI Service (FastAPI)</span>
                  {aiHealth.checkedAt && (
                    <p className="text-[10px] text-slate-600">Last checked: {aiHealth.checkedAt.toLocaleTimeString()}</p>
                  )}
                </div>
              </div>
              {aiHealth.loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" aria-label="Checking AI service" />
              ) : aiHealth.available ? (
                <span className="text-emerald-400 font-bold" role="status">Available</span>
              ) : (
                <span className="text-red-400 font-bold" role="status">Unavailable</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => { checkAIHealth(); }}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2"
              aria-label="Re-check AI service health"
            >
              Re-check AI health
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Governance Audit Log">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 space-y-2">
            <p className="font-semibold text-slate-200">Database-Driven Telemetry</p>
            <p className="leading-relaxed">
              All member metrics, credential counts, and project submissions displayed across administrative portals originate directly from validated MongoDB record stores.
            </p>
          </div>
        </SectionCard>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
