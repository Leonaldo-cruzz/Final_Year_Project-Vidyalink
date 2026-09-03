import React from 'react';
import { Users, FolderKanban, ShieldCheck, Activity, UserCheck } from 'lucide-react';

import DashboardLayout from '@/layouts/DashboardLayout';
import { StatCard, SectionCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/utils/formatters';

const RECENT_USERS = [
  { id: 1, name: 'Priya Sharma',   email: 'priya@vidyalink.edu',   role: 'student',   status: 'active',   joined: '2024-12-01' },
  { id: 2, name: 'Dr. Ramesh K',   email: 'ramesh@vidyalink.edu',  role: 'faculty',   status: 'active',   joined: '2024-11-28' },
  { id: 3, name: 'Sarah Recruiter',email: 'sarah@corp.com',         role: 'recruiter', status: 'pending',  joined: '2024-12-03' },
  { id: 4, name: 'Arun Alumni',    email: 'arun@vidyalink.edu',    role: 'alumni',    status: 'active',   joined: '2024-11-30' },
  { id: 5, name: 'Test User',      email: 'test@test.com',          role: 'student',   status: 'inactive', joined: '2024-12-02' },
];

const STATUS_CONFIG = {
  active:   { variant: 'emerald', label: 'Active' },
  pending:  { variant: 'amber',   label: 'Pending' },
  inactive: { variant: 'slate',   label: 'Inactive' },
};

const AdminDashboard = () => {
  const { user } = useAuth();

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
        <StatCard label="Total Users"       value="1,284" icon={Users}       color="blue"    trend={12} trendLabel="this month" />
        <StatCard label="Active Projects"   value="47"    icon={FolderKanban} color="emerald" trend={8}  trendLabel="this week" />
        <StatCard label="Pending Approvals" value="12"    icon={UserCheck}    color="amber" />
        <StatCard label="System Health"     value="99.8%" icon={Activity}     color="purple" />
      </div>

      {/* User Management Table */}
      <SectionCard
        title="Recent User Registrations"
        subtitle="Latest accounts created on the platform"
        className="mb-6"
        action={
          <button className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors">
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
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {RECENT_USERS.map((u) => {
                const { variant, label } = STATUS_CONFIG[u.status] || STATUS_CONFIG.inactive;
                return (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} size="sm" />
                        <span className="font-semibold text-slate-100 truncate max-w-[120px]">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-slate-400 text-xs hidden sm:table-cell truncate max-w-[160px]">{u.email}</td>
                    <td className="py-3 pr-4">
                      <Badge role={u.role} size="sm">{u.role}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-slate-500 text-xs hidden md:table-cell">
                      {formatDate(u.joined)}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={variant} size="sm">{label}</Badge>
                    </td>
                    <td className="py-3 text-right">
                      <button className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all font-semibold">
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
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
