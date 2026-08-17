import React, { useState, useEffect } from 'react';
import { Search, Shield, ShieldOff, CheckCircle2, AlertCircle } from 'lucide-react';

import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Spinner, { FullPageSpinner } from '@/components/ui/Spinner';
import adminService from '@/services/adminService';
import { formatDate, getErrorMessage } from '@/utils/formatters';

const STATUS_CONFIG = {
  active:   { variant: 'emerald', label: 'Active' },
  blocked:  { variant: 'rose',    label: 'Blocked' },
  inactive: { variant: 'slate',   label: 'Inactive' },
  pending:  { variant: 'amber',   label: 'Pending' },
};

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const data = await adminService.getAdminUsers({ page, limit: 10, search, role, status });
      setUsers(data.data.users);
      setPagination(data.data.pagination);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, role, status]);

  const handleStatusChange = async (userId, newStatus) => {
    try {
      await adminService.updateUserStatus(userId, newStatus);
      setUsers(users.map(u => u._id === userId ? { ...u, status: newStatus } : u));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update user status'));
    }
  };

  if (loading && users.length === 0) return <FullPageSpinner message="Loading users..." />;

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">User Management</h1>
          <p className="mt-1 text-sm text-slate-400">Manage platform access, roles, and user accounts.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <SectionCard className="mb-6">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-xl border border-slate-700 bg-slate-900/50 py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500/50 focus:bg-slate-900"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50 focus:bg-slate-900"
            >
              <option value="all">All Roles</option>
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="recruiter">Recruiter</option>
              <option value="alumni">Alumni</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50 focus:bg-slate-900"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                <th className="pb-3 text-left">User</th>
                <th className="pb-3 text-left">Email</th>
                <th className="pb-3 text-left">Role</th>
                <th className="pb-3 text-left">Joined</th>
                <th className="pb-3 text-left">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => {
                const { variant, label } = STATUS_CONFIG[u.status] || STATUS_CONFIG.inactive;
                return (
                  <tr key={u._id} className="hover:bg-slate-800/30">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.fullName} size="sm" />
                        <span className="font-semibold text-slate-100">{u.fullName}</span>
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-slate-400">{u.email}</td>
                    <td className="py-4 pr-4">
                      <Badge role={u.role} size="sm">{u.role}</Badge>
                    </td>
                    <td className="py-4 pr-4 text-slate-500">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="py-4 pr-4">
                      <Badge variant={variant} size="sm">{label}</Badge>
                    </td>
                    <td className="py-4 text-right">
                      {u.status === 'blocked' ? (
                        <Button 
                          size="sm" 
                          variant="success" 
                          onClick={() => handleStatusChange(u._id, 'active')}
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          Unblock
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="danger" 
                          onClick={() => handleStatusChange(u._id, 'blocked')}
                        >
                          <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                          Block
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    No users found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4 text-sm text-slate-400">
            <div>
              Showing {((pagination.page - 1) * 10) + 1} to {Math.min(pagination.page * 10, pagination.total)} of {pagination.total} entries
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => fetchUsers(pagination.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.pages}
                onClick={() => fetchUsers(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </SectionCard>
    </DashboardLayout>
  );
};

export default AdminUsers;
