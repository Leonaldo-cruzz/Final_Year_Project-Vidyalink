import React from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

const ACTION_COPY = {
  active: { title: 'Activate user', verb: 'activate', variant: 'success' },
  inactive: { title: 'Deactivate user', verb: 'deactivate', variant: 'danger' },
  blocked: { title: 'Block user', verb: 'block', variant: 'danger' },
};

const UserStatusModal = ({ target, loading, onClose, onConfirm }) => {
  const action = ACTION_COPY[target?.status] || ACTION_COPY.inactive;
  return (
    <Modal open={Boolean(target)} onClose={onClose} title={action.title} size="sm" footer={<><Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button><Button variant={action.variant} loading={loading} onClick={onConfirm}>{action.title}</Button></>}>
      <p className="text-sm leading-relaxed text-slate-300">Are you sure you want to {action.verb} <span className="font-semibold text-white">{target?.user?.fullName}</span>? {target?.status !== 'active' && 'They will not be able to use the platform while this status is in effect.'}</p>
    </Modal>
  );
};

export default UserStatusModal;
