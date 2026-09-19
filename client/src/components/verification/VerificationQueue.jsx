import React from 'react';
import { ArrowUpDown, Eye, Filter, GraduationCap, Inbox, Search, ShieldCheck } from 'lucide-react';

import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { formatDate, formatRelativeTime } from '@/utils/formatters';
import {
  getPriorityConfig,
  getStatusConfig,
  getVerificationTypeLabel,
  VERIFICATION_SORT_OPTIONS,
  VERIFICATION_STATUS_FILTERS,
  VERIFICATION_TARGET_FILTERS,
} from './verification.utils';

const VerificationQueue = ({
  verifications = [],
  status = 'ALL',
  targetType = 'ALL',
  search = '',
  sort = 'NEWEST',
  onStatusChange,
  onTargetTypeChange,
  onSearchChange,
  onSortChange,
  onReview,
  onView,
}) => {
  return (
    <section className="rounded-2xl border border-slate-800/70 bg-slate-900/60 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-800/60 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Verification Queue</h2>
          <p className="mt-0.5 text-xs text-slate-500">Review student portfolio evidence and provide verification decisions.</p>
        </div>
        <span className="text-xs font-semibold text-slate-400">
          {verifications.length} request{verifications.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Filter & Controls Bar */}
      <div className="flex flex-col gap-3 border-b border-slate-800/60 p-4 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Box */}
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search by student name, email, or college..."
              className="form-input h-10 pl-10 text-xs w-full"
              aria-label="Search verification requests"
            />
          </div>

          {/* Status and Sort Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Select */}
            {onStatusChange && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">Status:</span>
                <select
                  value={status}
                  onChange={(event) => onStatusChange(event.target.value)}
                  className="form-input h-9 bg-slate-950 text-xs w-auto py-1 px-2.5"
                  aria-label="Filter by verification status"
                >
                  {VERIFICATION_STATUS_FILTERS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort Select */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
              <select
                value={sort}
                onChange={(event) => onSortChange(event.target.value)}
                className="form-input h-9 bg-slate-950 text-xs w-auto py-1 px-2.5"
                aria-label="Sort verification requests"
              >
                {VERIFICATION_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Target Type Filter Tabs (All, Profile, Project, Certificate, Resume, GitHub) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1">
          <Filter className="h-4 w-4 flex-shrink-0 text-slate-500 mr-1" />
          <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Type:</span>
          {VERIFICATION_TARGET_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => onTargetTypeChange ? onTargetTypeChange(filter.value) : onStatusChange(filter.value)}
              className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                targetType === filter.value
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Queue List */}
      <div className="divide-y divide-slate-800/60">
        {verifications.map((verification) => {
          const statusConfig = getStatusConfig(verification.status);
          const priorityConfig = getPriorityConfig(verification.priority?.label);
          const isPending = verification.status === 'PENDING';

          return (
            <article key={verification._id} className="p-4 transition-colors hover:bg-slate-800/25 sm:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                {/* Student Info */}
                <div className="flex min-w-0 flex-1 items-start gap-3.5">
                  <Avatar name={verification.student?.fullName || 'Student'} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-bold text-white">
                        {verification.student?.fullName || 'Student Candidate'}
                      </h3>
                      <Badge
                        variant={statusConfig.variant}
                        size="sm"
                        dot={isPending}
                        pulse={isPending}
                      >
                        {statusConfig.label}
                      </Badge>
                      {verification.priority && (
                        <Badge variant={priorityConfig.variant} size="sm">
                          {priorityConfig.label} priority
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {verification.student?.email || 'Email not provided'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5 text-slate-600" />
                        {verification.student?.college || 'College not listed'}
                      </span>
                      <span>{verification.student?.branch || 'Branch not listed'}</span>
                    </div>
                  </div>
                </div>

                {/* Target Type & Submitted Date */}
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3 xl:w-[380px]">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Verification Type</p>
                    <p className="mt-1 inline-flex items-center gap-1.5 font-semibold text-slate-200">
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                      {getVerificationTypeLabel(verification.targetType)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Submitted Date</p>
                    <p
                      className="mt-1 font-semibold text-slate-200"
                      title={formatDate(verification.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
                    >
                      {formatRelativeTime(verification.createdAt)}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Current Status</p>
                    <p className="mt-1 font-semibold text-slate-300">
                      {statusConfig.label}
                    </p>
                  </div>
                </div>

                {/* Actions: View and Review */}
                <div className="flex items-center justify-end gap-2 xl:w-[170px]">
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={Eye}
                    onClick={() => (onView ? onView(verification) : onReview(verification))}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant={isPending ? 'primary' : 'outline'}
                    onClick={() => onReview(verification)}
                  >
                    {isPending ? 'Review' : 'Open'}
                  </Button>
                </div>
              </div>
            </article>
          );
        })}

        {!verifications.length && (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800/70">
              <Inbox className="h-6 w-6 text-slate-500" />
            </div>
            <h3 className="text-sm font-bold text-white">No verification requests found</h3>
            <p className="mt-1 text-xs text-slate-500">
              {search || targetType !== 'ALL' || status !== 'ALL'
                ? 'Try adjusting your filters or search query.'
                : 'All submissions are currently reviewed and up to date.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default VerificationQueue;
