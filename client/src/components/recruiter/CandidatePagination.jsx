import React from 'react';
import Button from '@/components/ui/Button';

const CandidatePagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/40 px-4 py-3">
      <p className="text-xs text-slate-500">Page {pagination.page} of {pagination.totalPages} · {pagination.total} candidates</p>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="ghost" disabled={!pagination.hasPrev} onClick={() => onPageChange(pagination.page - 1)}>Previous</Button>
        <Button type="button" size="sm" variant="secondary" disabled={!pagination.hasNext} onClick={() => onPageChange(pagination.page + 1)}>Next</Button>
      </div>
    </div>
  );
};

export default CandidatePagination;

