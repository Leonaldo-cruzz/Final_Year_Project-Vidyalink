import React, { useState, useEffect } from 'react';
import { Users, AlertCircle, CheckCircle2, MessageSquare, Clock, XCircle } from 'lucide-react';

import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Spinner, { FullPageSpinner } from '@/components/ui/Spinner';
import mentorshipService from '@/services/mentorshipService';
import { formatDate, getErrorMessage } from '@/utils/formatters';

const STATUS_CONFIG = {
  Pending:   { variant: 'amber',   label: 'Pending' },
  Accepted:  { variant: 'emerald', label: 'Accepted' },
  Rejected:  { variant: 'rose',    label: 'Rejected' },
  Completed: { variant: 'blue',    label: 'Completed' },
  Cancelled: { variant: 'slate',   label: 'Cancelled' },
};

const AlumniMentorship = () => {
  const [mentorships, setMentorships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchMentorships = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await mentorshipService.getMyMentorships();
      setMentorships(data.data || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load mentorships'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentorships();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      setActionLoading(id);
      await mentorshipService.updateMentorshipStatus(id, { status });
      setMentorships(prev => prev.map(m => m._id === id ? { ...m, status } : m));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update status'));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && mentorships.length === 0) return <FullPageSpinner message="Loading mentorship sessions..." />;

  const pending = mentorships.filter(m => m.status === 'Pending');
  const other = mentorships.filter(m => m.status !== 'Pending');

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Mentorship Management</h1>
          <p className="mt-1 text-sm text-slate-400">Review student requests and manage your active sessions.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Pending Requests */}
      <SectionCard title="Pending Requests" className="mb-6 border-amber-500/30">
        <div className="space-y-4">
          {pending.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">No pending mentorship requests.</p>
          ) : (
            pending.map((req) => (
              <div key={req._id} className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-5 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <Avatar name={req.studentId?.fullName} size="lg" />
                  <div>
                    <h3 className="font-semibold text-slate-100">{req.studentId?.fullName}</h3>
                    <p className="text-xs text-slate-500">{req.studentId?.email}</p>
                    <div className="mt-3">
                      <p className="text-sm font-medium text-slate-300">Topic: {req.topic}</p>
                      <p className="mt-1 text-sm text-slate-400">{req.message}</p>
                    </div>
                    {req.requestedSkills?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {req.requestedSkills.map((s) => (
                          <Badge key={s} variant="slate" size="sm">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-2 border-t border-slate-800 pt-4 md:border-0 md:pt-0">
                  <p className="text-xs text-slate-500 text-right md:mb-2">{formatDate(req.createdAt)}</p>
                  <Button 
                    size="sm" 
                    variant="success" 
                    disabled={actionLoading === req._id}
                    onClick={() => handleUpdateStatus(req._id, 'Accepted')}
                  >
                    {actionLoading === req._id ? <Spinner size="sm" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
                    Accept
                  </Button>
                  <Button 
                    size="sm" 
                    variant="danger" 
                    disabled={actionLoading === req._id}
                    onClick={() => handleUpdateStatus(req._id, 'Rejected')}
                  >
                    {actionLoading === req._id ? <Spinner size="sm" /> : <XCircle className="mr-1.5 h-4 w-4" />}
                    Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      {/* Other Sessions */}
      <SectionCard title="Session History & Active Mentees">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                <th className="pb-3 text-left">Student</th>
                <th className="pb-3 text-left">Topic</th>
                <th className="pb-3 text-left">Requested On</th>
                <th className="pb-3 text-left">Status</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {other.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-slate-500">No session history yet.</td>
                </tr>
              ) : (
                other.map((session) => {
                  const conf = STATUS_CONFIG[session.status];
                  return (
                    <tr key={session._id} className="hover:bg-slate-800/30">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={session.studentId?.fullName} size="sm" />
                          <span className="font-semibold text-slate-100">{session.studentId?.fullName}</span>
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-slate-300 max-w-xs truncate" title={session.topic}>{session.topic}</td>
                      <td className="py-4 pr-4 text-slate-500">{formatDate(session.createdAt)}</td>
                      <td className="py-4 pr-4">
                        <Badge variant={conf.variant} size="sm">{conf.label}</Badge>
                      </td>
                      <td className="py-4 text-right">
                        {session.status === 'Accepted' && (
                          <Button 
                            size="sm" 
                            variant="primary" 
                            disabled={actionLoading === session._id}
                            onClick={() => handleUpdateStatus(session._id, 'Completed')}
                          >
                            Mark Completed
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

    </DashboardLayout>
  );
};

export default AlumniMentorship;
