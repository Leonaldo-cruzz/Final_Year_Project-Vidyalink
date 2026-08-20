import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, BriefcaseBusiness, FolderKanban, RefreshCw, ShieldCheck,
  Users, UsersRound,
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard, StatCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { getAdminOverview, getAdminUsers } from '@/services/adminService';
import { formatDate, formatNumber, getErrorMessage } from '@/utils/formatters';

const statusVariant = (status) => ({ active: 'emerald', inactive: 'slate', blocked: 'rose' }[status] || 'slate');

const AdminDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async ({ manual = false } = {}) => {
    try {
      if (manual) setRefreshing(true);
      else setLoading(true);
      setError('');
      const [overviewResponse, usersResponse] = await Promise.all([
        getAdminOverview(),
        getAdminUsers({ page: 1, limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
      ]);
      setOverview(overviewResponse.data);
      setRecentUsers(usersResponse.data?.users || []);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to load the admin dashboard.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const cards = [
    { label: 'Total users', value: overview?.users, icon: Users, color: 'blue' },
    { label: 'Students', value: overview?.students, icon: UsersRound, color: 'blue' },
    { label: 'Faculty', value: overview?.faculty, icon: UsersRound, color: 'purple' },
    { label: 'Recruiters', value: overview?.recruiters, icon: BriefcaseBusiness, color: 'emerald' },
    { label: 'Alumni', value: overview?.alumni, icon: UsersRound, color: 'amber' },
    { label: 'Verified students', value: overview?.verifiedStudents, icon: ShieldCheck, color: 'emerald' },
    { label: 'Pending verifications', value: overview?.pendingVerifications, icon: ShieldCheck, color: 'amber' },
    { label: 'Total projects', value: overview?.projects, icon: FolderKanban, color: 'purple' },
    { label: 'Verified projects', value: overview?.verifiedProjects, icon: FolderKanban, color: 'emerald' },
    { label: 'Recruiter activities', value: overview?.recruiterActivities, icon: Activity, color: 'blue' },
    { label: 'Total referrals', value: overview?.referrals ?? '—', icon: BriefcaseBusiness, color: 'rose' },
  ];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3"><h1 className="text-2xl font-extrabold text-white">Platform overview</h1><Badge variant="rose" size="sm" dot>Admin</Badge></div>
            <p className="mt-1 text-sm text-slate-400">Live platform metrics, user oversight, and system availability.</p>
          </div>
          <div className="flex items-center gap-3"><span className="text-xs text-slate-500">{overview?.asOf ? `Updated ${new Date(overview.asOf).toLocaleString('en-IN')}` : ''}</span><Button variant="secondary" size="sm" leftIcon={RefreshCw} loading={refreshing} onClick={() => loadDashboard({ manual: true })}>Refresh</Button></div>
        </div>

        {error && <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error} <button className="ml-2 font-semibold underline" onClick={() => loadDashboard()}>Try again</button></div>}

        {loading && !overview ? <div className="flex min-h-64 items-center justify-center"><Spinner size="lg" /></div> : overview && <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <StatCard key={card.label} {...card} value={typeof card.value === 'number' ? formatNumber(card.value) : card.value} />)}</div>
          {overview.metricAvailability?.referrals === false && <p className="text-xs text-slate-500">Referrals are not shown because the current database does not persist referral records.</p>}

          <div className="grid gap-6 xl:grid-cols-3">
            <SectionCard title="Recent user registrations" subtitle="Latest accounts created on the platform" className="xl:col-span-2" action={<Link to="/admin/users" className="text-xs font-semibold text-blue-400 hover:text-blue-300">Manage users →</Link>}>
              {recentUsers.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No users have registered yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-sm"><thead><tr className="text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500"><th className="pb-3">User</th><th className="pb-3">Role</th><th className="pb-3">Joined</th><th className="pb-3">Status</th></tr></thead><tbody className="divide-y divide-slate-800/60">{recentUsers.map((user) => <tr key={user._id}><td className="py-3 pr-3"><div className="flex items-center gap-3"><Avatar name={user.fullName} src={user.avatar} size="sm" /><div><p className="font-semibold text-slate-100">{user.fullName}</p><p className="text-xs text-slate-500">{user.email}</p></div></div></td><td className="py-3 pr-3"><Badge role={user.role} size="sm">{user.role}</Badge></td><td className="py-3 pr-3 text-xs text-slate-400">{formatDate(user.createdAt)}</td><td className="py-3"><Badge variant={statusVariant(user.status)} size="sm">{user.status}</Badge></td></tr>)}</tbody></table></div>}
            </SectionCard>

            <SectionCard title="System health" subtitle="Current API and database state">
              <div className="space-y-3">
                {[['API server', overview.systemHealth?.api], ['Database', overview.systemHealth?.database]].map(([label, status]) => <div key={label} className="flex items-center justify-between rounded-xl border border-slate-800/70 bg-slate-950/50 p-3"><span className="text-sm text-slate-300">{label}</span><Badge variant={status === 'operational' ? 'emerald' : 'rose'} size="sm" dot pulse={status === 'operational'}>{status || 'unknown'}</Badge></div>)}
                <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-3"><p className="text-xs text-slate-500">API uptime</p><p className="mt-1 text-sm font-bold text-slate-200">{Math.floor((overview.systemHealth?.uptimeSeconds || 0) / 60)} minutes</p></div>
              </div>
            </SectionCard>
          </div>
        </>}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
