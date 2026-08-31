import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import alumniService from '@/services/alumniService';
import { useAuth } from '@/context/AuthContext';

import ScheduleMockInterviewModal from '@/components/alumni/ScheduleMockInterviewModal';
import MockInterviewDetailsModal from '@/components/alumni/MockInterviewDetailsModal';

import {
  Calendar, Video, MapPin, CheckCircle2, Clock,
  Eye, CheckSquare, XCircle, Plus, Star,
} from 'lucide-react';

const MockInterviewRequests = () => {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [successMsg, setSuccessMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    fetchInterviews();
  }, [statusFilter]);

  const fetchInterviews = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await alumniService.getMockInterviews({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      setInterviews(data.interviews || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load mock interviews');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleSubmit = async (interviewId, payload) => {
    setActionLoading(true);
    try {
      await alumniService.scheduleMockInterview(interviewId, payload);
      setSuccessMsg('Mock interview scheduled successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchInterviews();
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteSubmit = async (interviewId, payload) => {
    setActionLoading(true);
    try {
      await alumniService.completeMockInterview(interviewId, payload);
      setSuccessMsg('Mock interview completed and scorecard saved!');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchInterviews();
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async (id) => {
    setActionLoading(true);
    try {
      await alumniService.declineMockInterview(id);
      setSuccessMsg('Mock interview request declined');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchInterviews();
    } finally {
      setActionLoading(false);
    }
  };

  const openSchedule = (interview) => {
    setSelectedInterview(interview);
    setShowScheduleModal(true);
  };

  const openDetails = (interview) => {
    setSelectedInterview(interview);
    setShowDetailsModal(true);
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'REQUESTED':
        return <Badge variant="amber">Requested</Badge>;
      case 'ACCEPTED':
        return <Badge variant="blue">Accepted</Badge>;
      case 'SCHEDULED':
        return <Badge variant="purple">Scheduled</Badge>;
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
            <h1 className="text-2xl font-extrabold text-white">Mock Technical Interviews</h1>
            <p className="text-slate-400 text-sm mt-1">
              Prepare upcoming graduates through online video or campus offline technical drills.
            </p>
          </div>
        </div>

        {/* Alerts */}
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
          {['ALL', 'REQUESTED', 'SCHEDULED', 'COMPLETED', 'DECLINED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab === 'ALL' ? 'All Interviews' : tab}
            </button>
          ))}
        </div>

        {/* Interviews List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : interviews.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-200">No mock interviews found</h3>
            <p className="text-xs text-slate-500 mt-1">
              {statusFilter === 'ALL'
                ? 'Scheduled mock sessions with students will appear here.'
                : `No interview sessions with status '${statusFilter}'.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {interviews.map((item) => (
              <div
                key={item._id}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <Avatar name={item.student?.fullName || 'Student'} size="lg" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-slate-100">{item.student?.fullName}</h4>
                      {getStatusBadge(item.status)}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {item.student?.college} {item.student?.branch ? `• ${item.student.branch}` : ''}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-300">
                      <span className="font-semibold text-amber-400">{item.roleTarget}</span>
                      <span className="text-slate-600">•</span>
                      <span className="flex items-center gap-1">
                        {item.mode === 'ONLINE' ? (
                          <span className="text-blue-400 flex items-center gap-1">
                            <Video className="w-3.5 h-3.5" /> Online
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" /> Offline
                          </span>
                        )}
                      </span>
                      {item.scheduledDate && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span className="flex items-center gap-1 text-purple-300">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(item.scheduledDate).toLocaleString()}
                          </span>
                        </>
                      )}
                    </div>

                    {item.feedback?.rating && (
                      <div className="flex items-center gap-1 text-amber-400 mt-2 text-xs font-semibold">
                        <span>Score:</span>
                        {[...Array(item.feedback.rating)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-current" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                  <Button variant="secondary" size="sm" onClick={() => openDetails(item)}>
                    <Eye className="w-3.5 h-3.5 mr-1.5" /> Scorecard / Details
                  </Button>

                  {item.status === 'REQUESTED' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                        onClick={() => handleDecline(item._id)}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1.5" /> Decline
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => openSchedule(item)}>
                        <Calendar className="w-3.5 h-3.5 mr-1.5" /> Schedule
                      </Button>
                    </>
                  )}

                  {(item.status === 'ACCEPTED' || item.status === 'SCHEDULED') && (
                    <Button variant="primary" size="sm" onClick={() => openDetails(item)}>
                      <CheckSquare className="w-3.5 h-3.5 mr-1.5" /> Evaluate & Complete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Schedule Modal */}
        <ScheduleMockInterviewModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          interview={selectedInterview}
          onSchedule={handleScheduleSubmit}
          loading={actionLoading}
        />

        {/* Details / Scorecard Modal */}
        <MockInterviewDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          interview={selectedInterview}
          isAlumni={true}
          onAccept={() => {}}
          onDecline={handleDecline}
          onOpenSchedule={openSchedule}
          onComplete={handleCompleteSubmit}
          loading={actionLoading}
        />
      </div>
    </DashboardLayout>
  );
};

export default MockInterviewRequests;
