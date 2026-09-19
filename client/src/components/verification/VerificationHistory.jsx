import React, { useMemo, useState } from 'react';
import { History, Filter, User, ShieldCheck } from 'lucide-react';

import Badge from '@/components/ui/Badge';
import { formatDate } from '@/utils/formatters';
import { getStatusConfig, getVerificationTypeLabel } from './verification.utils';

const HISTORY_FILTERS = [
  { label: 'All History', value: 'ALL' },
  { label: 'Verified', value: 'VERIFIED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Changes Requested', value: 'CHANGES_REQUESTED' },
];

const StatusBadge = ({ status }) => {
  const config = getStatusConfig(status);
  return <Badge variant={config.variant} size="sm">{config.label}</Badge>;
};

const VerificationHistory = ({ history = [], studentName = '' }) => {
  const [filter, setFilter] = useState('ALL');

  const filteredHistory = useMemo(() => {
    if (filter === 'ALL') return history;
    return history.filter((item) => {
      const current = String(item.currentStatus || item.status || '').toUpperCase().replace(/[\s-]/g, '_');
      return current === filter;
    });
  }, [history, filter]);

  return (
    <section className="rounded-2xl border border-slate-800/70 bg-slate-900/60 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
            <History className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Verification History & Audit Log</h2>
            <p className="text-xs text-slate-500">Track prior reviews, status transitions, and faculty remarks.</p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Filter className="h-3.5 w-3.5 text-slate-500 mr-1 flex-shrink-0" />
          {HISTORY_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                filter === f.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* History Items */}
      {filteredHistory.length > 0 ? (
        <div className="divide-y divide-slate-800/60">
          {filteredHistory.map((item, idx) => {
            const facultyName = item.facultyId?.fullName || item.facultyName || 'Awaiting review';
            const student = item.studentId?.fullName || studentName || 'Student';
            const date = item.verificationDate || item.verifiedAt || item.updatedAt || item.createdAt;
            const prevStatus = item.previousStatus || 'PENDING';
            const currStatus = item.currentStatus || item.status || 'PENDING';

            return (
              <article key={item._id || idx} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4 items-start">
                {/* Student & Target */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Student & Target</p>
                  <p className="mt-1 text-sm font-semibold text-white flex items-center gap-1.5 truncate">
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    {student}
                  </p>
                  {item.targetType && (
                    <p className="mt-0.5 text-xs text-blue-400 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      {getVerificationTypeLabel(item.targetType)}
                    </p>
                  )}
                </div>

                {/* Status Transition */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Status Change</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={prevStatus} />
                    <span className="text-xs text-slate-600">→</span>
                    <StatusBadge status={currStatus} />
                  </div>
                </div>

                {/* Faculty & Date */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Reviewer & Date</p>
                  <p className="mt-1 text-xs font-semibold text-slate-200">{facultyName}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {formatDate(date, { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>

                {/* Remarks */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Remarks</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
                    {item.remarks || <span className="text-slate-500 italic">No remarks recorded.</span>}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-xs text-slate-500">
            {filter !== 'ALL'
              ? `No history records matching "${filter}".`
              : 'No verification decisions recorded yet.'}
          </p>
        </div>
      )}
    </section>
  );
};

export default VerificationHistory;
