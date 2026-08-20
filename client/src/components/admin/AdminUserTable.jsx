import React from 'react';
import { Eye, ShieldBan, UserCheck, UserX } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { formatDate } from '@/utils/formatters';

const STATUS_VARIANT = { active: 'emerald', inactive: 'slate', blocked: 'rose' };

const AdminUserTable = ({ users, currentUserId, onView, onStatusChange }) => {
  if (!users.length) {
    return <div className="py-16 text-center text-sm text-slate-500">No users match the selected filters.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Joined</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {users.map((user) => {
            const isCurrentUser = user._id === currentUserId;
            return (
              <tr key={user._id} className="transition-colors hover:bg-slate-800/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={user.fullName} src={user.avatar} size="sm" />
                    <div className="min-w-0">
                      <p className="max-w-[220px] truncate font-semibold text-slate-100">{user.fullName}</p>
                      <p className="max-w-[220px] truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><Badge role={user.role} size="sm">{user.role}</Badge></td>
                <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[user.status] || 'slate'} size="sm">{user.status}</Badge></td>
                <td className="px-4 py-3 text-xs text-slate-400">{formatDate(user.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button size="xs" variant="secondary" leftIcon={Eye} onClick={() => onView(user)}>View</Button>
                    {!isCurrentUser && user.status !== 'active' && <Button size="xs" variant="success" leftIcon={UserCheck} onClick={() => onStatusChange(user, 'active')}>Activate</Button>}
                    {!isCurrentUser && user.status === 'active' && <Button size="xs" variant="ghost" leftIcon={UserX} onClick={() => onStatusChange(user, 'inactive')}>Deactivate</Button>}
                    {!isCurrentUser && user.status !== 'blocked' && <Button size="xs" variant="danger" leftIcon={ShieldBan} onClick={() => onStatusChange(user, 'blocked')}>Block</Button>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AdminUserTable;
