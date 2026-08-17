import React, { useState, useEffect } from 'react';
import { Users, FolderKanban, ShieldCheck, Activity, UserCheck, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import DashboardLayout from '@/layouts/DashboardLayout';
import { StatCard, SectionCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Spinner, { FullPageSpinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { formatDate, getErrorMessage } from '@/utils/formatters';
import adminService from '@/services/adminService';
import { ROLES, ROUTES } from '@/constants';

const STATUS_CONFIG = {
  active:   { variant: 'emerald', label: 'Active' },
  blocked:  { variant: 'rose',    label: 'Blocked' },
  inactive: { variant: 'slate',   label: 'Inactive' },
  pending:  { variant: 'amber',   label: 'Pending' },
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const data = await adminService.getAdminAnalytics();
        setAnalytics(data.data); // data.data because ApiResponse wrapper
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load analytics'));
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) return <FullPageSpinner message="Loading admin analytics..." />;

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      </DashboardLayout>
    );
  }

  const { stats, recentUsers } = analytics || {};

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-extrabold text-white">Admin Control Panel</h1>
          <Badge variant="rose" size="sm" dot>Admin</Badge>
        </div>
        <p className="text-slate-400 text-sm">
          Platform oversight and user management, {user?.fullName?.split(' ')[0]}.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
        <StatCard label="Total Users"       value={stats?.totalUsers || 0} icon={Users}       color="blue"    />
        <StatCard label="Active Projects"   value={stats?.activeProjects || 0}    icon={FolderKanban} color="emerald" />
        <StatCard label="Pending Verifications" value={stats?.verifications?.pending || 0}    icon={UserCheck}    color="amber" />
        <StatCard label="System Health"     value="99.8%" icon={Activity}     color="purple" />
      </div>

      {/* User Management Table */}
      <SectionCard
        title="Recent User Registrations"
        subtitle="Latest accounts created on the platform"
        className="mb-6"
        action={
          <button 
            onClick={() => navigate('/admin/users')}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
          >
            Manage All Users →
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                <th className="pb-3 text-left">User</th>
                <th className="pb-3 text-left hidden sm:table-cell">Email</th>
                <th className="pb-3 text-left">Role</th>
                <th className="pb-3 text-left hidden md:table-cell">Joined</th>
                <th className="pb-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentUsers && recentUsers.length > 0 ? (
                recentUsers.map((u) => {
                  const { variant, label } = STATUS_CONFIG[u.status] || STATUS_CONFIG.inactive;
                  return (
                    <tr key={u._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.fullName} size="sm" />
                          <span className="font-semibold text-slate-100 truncate max-w-[120px]">{u.fullName}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-400 text-xs hidden sm:table-cell truncate max-w-[160px]">{u.email}</td>
                      <td className="py-3 pr-4">
                        <Badge role={u.role} size="sm">{u.role}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-slate-500 text-xs hidden md:table-cell">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={variant} size="sm">{label}</Badge>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-slate-500">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* System Status */}
      <SectionCard title="System Status" subtitle="Real-time platform health indicators">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'API Server',       status: 'Operational', color: 'emerald' },
            { label: 'Database',         status: 'Operational', color: 'emerald' },
            { label: 'Auth Service',     status: 'Operational', color: 'emerald' },
          ].map(({ label, status, color }) => (
            <div key={label} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-slate-200">{label}</span>
              </div>
              <Badge variant={color} size="sm" dot pulse>{status}</Badge>
            </div>
          ))}
        </div>
      </SectionCard>
    </DashboardLayout>
  );
};

export default AdminDashboard;
