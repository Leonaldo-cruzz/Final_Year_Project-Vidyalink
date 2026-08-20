import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import Button from '@/components/ui/Button';

const ROLES = ['student', 'faculty', 'recruiter', 'alumni', 'admin'];
const STATUSES = ['active', 'inactive', 'blocked'];

const UserFilters = ({ filters, onChange, onSearch, onReset }) => (
  <form onSubmit={onSearch} className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4">
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_170px_160px_auto] lg:items-end">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-slate-400">Search</span>
        <span className="relative block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={filters.search} onChange={(event) => onChange('search', event.target.value)} placeholder="Name or email" className="form-input pl-9" maxLength={100} />
        </span>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-slate-400">Role</span>
        <select value={filters.role} onChange={(event) => onChange('role', event.target.value)} className="form-input">
          <option value="">All roles</option>
          {ROLES.map((role) => <option value={role} key={role}>{role}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-slate-400">Status</span>
        <select value={filters.status} onChange={(event) => onChange('status', event.target.value)} className="form-input">
          <option value="">All statuses</option>
          {STATUSES.map((status) => <option value={status} key={status}>{status}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-slate-400">Sort</span>
        <select value={`${filters.sortBy}:${filters.sortOrder}`} onChange={(event) => {
          const [sortBy, sortOrder] = event.target.value.split(':');
          onChange('sortBy', sortBy);
          onChange('sortOrder', sortOrder);
        }} className="form-input">
          <option value="createdAt:desc">Newest first</option>
          <option value="createdAt:asc">Oldest first</option>
          <option value="fullName:asc">Name A–Z</option>
          <option value="email:asc">Email A–Z</option>
          <option value="role:asc">Role</option>
          <option value="status:asc">Status</option>
        </select>
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="md" leftIcon={SlidersHorizontal}>Apply</Button>
        <Button type="button" size="md" variant="ghost" onClick={onReset}>Reset</Button>
      </div>
    </div>
  </form>
);

export default UserFilters;
