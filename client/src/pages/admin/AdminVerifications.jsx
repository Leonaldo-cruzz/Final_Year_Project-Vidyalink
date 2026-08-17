import React, { useState, useEffect } from 'react';
import { AlertCircle, Link2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Spinner, { FullPageSpinner } from '@/components/ui/Spinner';
import adminService from '@/services/adminService';
import { formatDate, getErrorMessage } from '@/utils/formatters';
import { getStatusConfig, getVerificationTypeLabel } from '@/components/verification/verification.utils';

const AdminVerifications = () => {
  const [verifications, setVerifications] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [status, setStatus] = useState('ALL');

  const fetchVerifications = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const data = await adminService.getAllVerifications({ page, limit: 10, status });
      setVerifications(data.data.verifications);
      setPagination(data.data.pagination);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load verifications'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications(1);
  }, [status]);

  if (loading && verifications.length === 0) return <FullPageSpinner message="Loading verifications..." />;

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">All Verifications</h1>
          <p className="mt-1 text-sm text-slate-400">View and monitor all verification requests across the platform.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <SectionCard className="mb-6">
        <div className="flex justify-end mb-4">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50 focus:bg-slate-900"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
            <option value="CHANGES_REQUESTED">Changes Requested</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                <th className="pb-3 text-left">Student</th>
                <th className="pb-3 text-left">Type</th>
                <th className="pb-3 text-left">Submitted</th>
                <th className="pb-3 text-left">Status</th>
                <th className="pb-3 text-left">Faculty Reviewer</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {verifications.map((v) => {
                const statusConfig = getStatusConfig(v.status);
                return (
                  <tr key={v._id} className="hover:bg-slate-800/30">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={v.studentId?.fullName} size="sm" />
                        <span className="font-semibold text-slate-100">{v.studentId?.fullName}</span>
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-slate-400">
                      {getVerificationTypeLabel(v.targetType)}
                    </td>
                    <td className="py-4 pr-4 text-slate-500">
                      {formatDate(v.createdAt)}
                    </td>
                    <td className="py-4 pr-4">
                      <Badge variant={statusConfig.variant} size="sm" dot={v.status === 'PENDING'}>
                        {statusConfig.label}
                      </Badge>
                    </td>
                    <td className="py-4 pr-4 text-slate-500">
                      {v.facultyId ? v.facultyId.fullName : 'Unassigned'}
                    </td>
                    <td className="py-4 text-right">
                      <Link to={`/faculty/verifications/${v._id}`}>
                        <Button size="sm" variant="outline">
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {verifications.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    No verification requests found.
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
                onClick={() => fetchVerifications(pagination.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.pages}
                onClick={() => fetchVerifications(pagination.page + 1)}
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

export default AdminVerifications;
