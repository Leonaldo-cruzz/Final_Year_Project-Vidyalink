import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import alumniService from '@/services/alumniService';
import MentorshipDetailsModal from '@/components/alumni/MentorshipDetailsModal';
import {
  MessageSquare, CheckCircle2, XCircle, CheckSquare,
  Clock, ArrowRight, Eye, User, Star, Filter,
} from 'lucide-react';

const MentorshipRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await alumniService.getMentorshipRequests({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      setRequests(data.requests || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load mentorship requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id) => {
    setActionLoading(true);
    try {
      await alumniService.acceptMentorship(id);
      setSuccessMsg('Mentorship request accepted!');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchRequests();
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async (id, data) => {
    setActionLoading(true);
    try {
      await alumniService.declineMentorship(id, data);
      setSuccessMsg('Mentorship request declined');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchRequests();
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (id, data) => {
    setActionLoading(true);
    try {
      await alumniService.completeMentorship(id, data);
      setSuccessMsg('Mentorship session marked as completed with feedback!');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchRequests();
    } finally {
      setActionLoading(false);
    }
  };

  const openDetails = (req) => {
    setSelectedRequest(req);
    setModalOpen(true);
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'PENDING':
        return <Badge variant="amber">Pending</Badge>;
      case 'ACCEPTED':
        return <Badge variant="blue">Accepted</Badge>;
      case 'COMPLETED':
        return <Badge variant="emerald">Completed</Badge>;
      case 'DECLINED':
        return <Badge variant="rose">Declined</Badge>;
      case 'CANCELLED':
        return <Badge variant="slate">Cancelled</Badge>;
      default:
        return <Badge>{st}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Mentorship Requests</h1>
            <p className="text-slate-400 text-sm mt-1">
              Guide students, accept mentees, and provide career & technical mentorship.
            </p>
          </div>
        </div>

        {/* Success / Error alerts */}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            {successMsg}
          </div>
        )}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-sm">
            {error}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['ALL', 'PENDING', 'ACCEPTED', 'COMPLETED', 'DECLINED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab === 'ALL' ? 'All Requests' : tab}
            </button>
          ))}
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
            <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-200">No mentorship requests found</h3>
            <p className="text-xs text-slate-500 mt-1">
              {statusFilter === 'ALL'
                ? 'When students submit mentorship inquiries, they will appear here.'
                : `No requests with status '${statusFilter}'.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req._id}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <Avatar name={req.student?.fullName || 'Student'} size="lg" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-slate-100">{req.student?.fullName}</h4>
                      {getStatusBadge(req.status)}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {req.student?.college} {req.student?.branch ? `• ${req.student.branch}` : ''}
                    </p>
                    <div className="mt-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 max-w-xl">
                      <p className="text-xs font-semibold text-amber-400">Topic: {req.topic}</p>
                      <p className="text-xs text-slate-300 line-clamp-2 mt-1">{req.message}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                  <Button variant="secondary" size="sm" onClick={() => openDetails(req)}>
                    <Eye className="w-3.5 h-3.5 mr-1.5" /> Details
                  </Button>

                  {req.status === 'PENDING' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                        onClick={() => handleDecline(req._id)}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1.5" /> Decline
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAccept(req._id)}
                        loading={actionLoading}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Accept
                      </Button>
                    </>
                  )}

                  {req.status === 'ACCEPTED' && (
                    <Button variant="primary" size="sm" onClick={() => openDetails(req)}>
                      <CheckSquare className="w-3.5 h-3.5 mr-1.5" /> Review & Complete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        <MentorshipDetailsModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          request={selectedRequest}
          isAlumni={true}
          onAccept={handleAccept}
          onDecline={handleDecline}
          onComplete={handleComplete}
          loading={actionLoading}
        />
      </div>
    </DashboardLayout>
  );
};

export default MentorshipRequests;
