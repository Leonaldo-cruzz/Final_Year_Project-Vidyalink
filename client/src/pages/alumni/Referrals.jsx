import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import alumniService from '@/services/alumniService';
import { useAuth } from '@/context/AuthContext';

import CreateReferralModal from '@/components/alumni/CreateReferralModal';
import ReferralDetailsModal from '@/components/alumni/ReferralDetailsModal';

import {
  Share2, Building2, Briefcase, ExternalLink,
  CheckCircle2, Clock, Eye, Plus, Users,
} from 'lucide-react';

const Referrals = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [successMsg, setSuccessMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchReferrals();
  }, [statusFilter]);

  const fetchReferrals = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await alumniService.getReferrals({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      setReferrals(data.referrals || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (referralId, payload) => {
    setActionLoading(true);
    try {
      await alumniService.updateReferral(referralId, payload);
      setSuccessMsg('Referral progress updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchReferrals();
      setShowDetailsModal(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update referral');
    } finally {
      setActionLoading(false);
    }
  };

  const openDetails = (referral) => {
    setSelectedReferral(referral);
    setShowDetailsModal(true);
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'DRAFT':
        return <Badge variant="slate">Draft</Badge>;
      case 'SUBMITTED':
        return <Badge variant="amber">Submitted</Badge>;
      case 'UNDER_REVIEW':
        return <Badge variant="blue">Under Review</Badge>;
      case 'REFERRED':
        return <Badge variant="emerald">Referred</Badge>;
      case 'REJECTED':
        return <Badge variant="rose">Not Selected</Badge>;
      case 'CLOSED':
        return <Badge variant="slate">Closed</Badge>;
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
            <h1 className="text-2xl font-extrabold text-white">Job Referrals Tracking</h1>
            <p className="text-slate-400 text-sm mt-1">
              Refer verified student candidates to opportunities at your organization and track their recruitment pipeline.
            </p>
          </div>
          <Button variant="primary" onClick={() => navigate('/alumni/students')}>
            <Users className="w-4 h-4 mr-1.5" /> Refer from Student Hub
          </Button>
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

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'REFERRED', 'REJECTED', 'CLOSED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab === 'ALL' ? 'All Referrals' : tab}
            </button>
          ))}
        </div>

        {/* Referrals List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : referrals.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
            <Share2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-200">No referrals found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              You haven't referred any candidates with this status yet. Browse top students to recommend them.
            </p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate('/alumni/students')}>
              Browse Students
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {referrals.map((ref) => (
              <div
                key={ref._id}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <Avatar name={ref.student?.fullName || 'Student'} size="lg" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-slate-100">{ref.student?.fullName}</h4>
                      {getStatusBadge(ref.status)}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {ref.student?.college} {ref.student?.branch ? `• ${ref.student.branch}` : ''}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-300">
                      <span className="font-semibold text-emerald-400 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" /> {ref.company}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-blue-400 flex items-center gap-1 font-medium">
                        <Briefcase className="w-3.5 h-3.5" /> {ref.jobTitle}
                      </span>
                      {ref.jobUrl && (
                        <>
                          <span className="text-slate-600">•</span>
                          <a
                            href={ref.jobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
                          >
                            Job Link <ExternalLink className="w-3 h-3" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                  <Button variant="secondary" size="sm" onClick={() => openDetails(ref)}>
                    <Eye className="w-3.5 h-3.5 mr-1.5" /> Manage & Update
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Details / Status Modal */}
        <ReferralDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          referral={selectedReferral}
          isAlumni={true}
          onUpdateStatus={handleUpdateStatus}
          loading={actionLoading}
        />
      </div>
    </DashboardLayout>
  );
};

export default Referrals;
