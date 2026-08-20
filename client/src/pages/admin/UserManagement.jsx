import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Users } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { getAdminUser, getAdminUsers, updateAdminUserRole, updateAdminUserStatus } from '@/services/adminService';
import { getErrorMessage } from '@/utils/formatters';
import UserFilters from '@/components/admin/UserFilters';
import AdminUserTable from '@/components/admin/AdminUserTable';
import UserDetailsModal from '@/components/admin/UserDetailsModal';
import UserStatusModal from '@/components/admin/UserStatusModal';

const INITIAL_FILTERS = { search: '', role: '', status: '', sortBy: 'createdAt', sortOrder: 'desc' };

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ users: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getAdminUsers({ ...appliedFilters, page, limit: 20 });
      setResult(response.data || { users: [], pagination: { page, limit: 20, total: 0, totalPages: 0 } });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to load users.'));
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const updateDisplayedUser = (updatedUser) => {
    setResult((current) => ({ ...current, users: current.users.map((item) => item._id === updatedUser._id ? updatedUser : item) }));
    setSelectedUser((current) => current?._id === updatedUser._id ? updatedUser : current);
  };

  const handleView = async (item) => {
    try {
      setError('');
      const response = await getAdminUser(item._id);
      setSelectedUser(response.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to load user details.'));
    }
  };

  const handleStatusConfirm = async () => {
    if (!statusTarget) return;
    try {
      setSaving(true);
      setError('');
      const response = await updateAdminUserStatus(statusTarget.user._id, statusTarget.status);
      updateDisplayedUser(response.data);
      setStatusTarget(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to update user status.'));
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (targetUser, role) => {
    try {
      setSaving(true);
      setError('');
      const response = await updateAdminUserRole(targetUser._id, role);
      updateDisplayedUser(response.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to update user role.'));
    } finally {
      setSaving(false);
    }
  };

  const pagination = result.pagination || {};
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h1 className="text-2xl font-extrabold text-white">User management</h1><p className="mt-1 text-sm text-slate-400">Search, review, and securely manage platform accounts.</p></div>
          <Button variant="secondary" size="sm" leftIcon={RefreshCw} loading={loading} onClick={loadUsers}>Refresh</Button>
        </div>
        <UserFilters filters={filters} onChange={(name, value) => setFilters((current) => ({ ...current, [name]: value }))} onSearch={(event) => { event.preventDefault(); setPage(1); setAppliedFilters(filters); }} onReset={() => { setFilters(INITIAL_FILTERS); setAppliedFilters(INITIAL_FILTERS); setPage(1); }} />
        {error && <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        <div className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/60">
          <div className="flex items-center justify-between border-b border-slate-800/60 px-5 py-4"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-400" /><h2 className="text-sm font-bold text-white">Accounts</h2></div><span className="text-xs text-slate-500">{pagination.total || 0} total</span></div>
          {loading ? <div className="flex min-h-64 items-center justify-center"><Spinner size="lg" /></div> : <AdminUserTable users={result.users || []} currentUserId={currentUser?._id} onView={handleView} onStatusChange={(item, status) => setStatusTarget({ user: item, status })} />}
          {!loading && pagination.totalPages > 1 && <div className="flex items-center justify-between border-t border-slate-800/60 px-5 py-4"><p className="text-xs text-slate-500">Page {pagination.page} of {pagination.totalPages}</p><div className="flex gap-2"><Button size="xs" variant="secondary" leftIcon={ChevronLeft} disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button><Button size="xs" variant="secondary" rightIcon={ChevronRight} disabled={page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button></div></div>}
        </div>
      </div>
      <UserDetailsModal user={selectedUser} currentUserId={currentUser?._id} loading={saving} onClose={() => setSelectedUser(null)} onChangeRole={handleRoleChange} />
      <UserStatusModal target={statusTarget} loading={saving} onClose={() => setStatusTarget(null)} onConfirm={handleStatusConfirm} />
    </DashboardLayout>
  );
};

export default UserManagement;
