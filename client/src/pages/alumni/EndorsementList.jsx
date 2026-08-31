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
import { Award, Trash2, CheckCircle2, Plus, Users, Search } from 'lucide-react';

const EndorsementList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [endorsements, setEndorsements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchEndorsements();
  }, []);

  const fetchEndorsements = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await alumniService.getEndorsements({ alumniId: user._id });
      setEndorsements(data.endorsements || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load endorsements');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this skill endorsement?')) return;
    setActionLoading(true);
    try {
      await alumniService.deleteEndorsement(id);
      setSuccessMsg('Skill endorsement revoked successfully');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchEndorsements();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete endorsement');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Skill Endorsements</h1>
            <p className="text-slate-400 text-sm mt-1">
              Verify and endorse technical proficiencies of promising students you have collaborated with.
            </p>
          </div>
          <Button variant="primary" onClick={() => navigate('/alumni/students')}>
            <Users className="w-4 h-4 mr-1.5" /> Endorse from Student Hub
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

        {/* Endorsements List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : endorsements.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
            <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-200">No endorsements given yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Explore verified student profiles and endorse skills they have demonstrated in projects or workshops.
            </p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate('/alumni/students')}>
              Discover Students
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {endorsements.map((en) => (
              <div
                key={en._id}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={en.student?.fullName || 'Student'} size="md" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-100">{en.student?.fullName}</h4>
                        <p className="text-xs text-slate-400">{en.student?.college}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(en._id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      title="Revoke Endorsement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                      <Award className="w-4 h-4" /> {en.skill}
                    </div>
                    {en.message && (
                      <p className="text-xs text-slate-300 italic">"{en.message}"</p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Endorsed on {new Date(en.createdAt).toLocaleDateString()}</span>
                  <button
                    onClick={() => navigate(`/alumni/students/${en.student?._id}`)}
                    className="text-amber-400 hover:text-amber-300 font-semibold"
                  >
                    View Portfolio →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EndorsementList;
