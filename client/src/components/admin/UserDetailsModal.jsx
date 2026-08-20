import React, { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { formatDate } from '@/utils/formatters';

const ROLES = ['student', 'faculty', 'recruiter', 'alumni', 'admin'];

const UserDetailsModal = ({ user, currentUserId, loading, onClose, onChangeRole }) => {
  const [role, setRole] = useState(user?.role || 'student');

  useEffect(() => setRole(user?.role || 'student'), [user]);

  const isCurrentUser = user?._id === currentUserId;
  const details = [
    ['Email', user?.email],
    ['College', user?.college || 'Not provided'],
    ['Branch', user?.branch || 'Not provided'],
    ['Graduation year', user?.graduationYear || 'Not provided'],
    ['Email verified', user?.isEmailVerified ? 'Yes' : 'No'],
    ['Joined', formatDate(user?.createdAt)],
    ['Last updated', formatDate(user?.updatedAt)],
  ];

  return (
    <Modal open={Boolean(user)} onClose={onClose} title="User details" size="lg" footer={<Button variant="ghost" onClick={onClose} disabled={loading}>Close</Button>}>
      {user && <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar name={user.fullName} src={user.avatar} size="lg" />
          <div>
            <h3 className="text-lg font-bold text-white">{user.fullName}</h3>
            <div className="mt-1 flex gap-2"><Badge role={user.role} size="sm">{user.role}</Badge><Badge variant={user.status === 'active' ? 'emerald' : user.status === 'blocked' ? 'rose' : 'slate'} size="sm">{user.status}</Badge></div>
          </div>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          {details.map(([label, value]) => <div key={label} className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-3"><dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm text-slate-200">{value}</dd></div>)}
        </dl>
        <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-4">
          <p className="text-sm font-bold text-white">Role</p>
          <p className="mt-1 text-xs text-slate-500">Role changes take effect on the user’s next authenticated request.</p>
          {isCurrentUser ? <p className="mt-3 text-sm text-slate-400">You cannot change your own role.</p> : <div className="mt-3 flex flex-col gap-2 sm:flex-row"><select className="form-input flex-1" value={role} onChange={(event) => setRole(event.target.value)}>{ROLES.map((item) => <option value={item} key={item}>{item}</option>)}</select><Button disabled={role === user.role} loading={loading} onClick={() => onChangeRole(user, role)}>Save role</Button></div>}
        </div>
      </div>}
    </Modal>
  );
};

export default UserDetailsModal;
