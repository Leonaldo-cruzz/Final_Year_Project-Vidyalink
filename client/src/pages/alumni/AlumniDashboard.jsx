import React, { useState, useEffect } from 'react';
import { Users, CalendarCheck, Share2, ArrowRight, Lightbulb, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import DashboardLayout from '@/layouts/DashboardLayout';
import { StatCard, SectionCard, ActionCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import mentorshipService from '@/services/mentorshipService';
import { ROUTES } from '@/constants';
import { formatDate } from '@/utils/formatters';

const AlumniDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [mentorships, setMentorships] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMentorships = async () => {
      try {
        setLoading(true);
        const data = await mentorshipService.getMyMentorships();
        setMentorships(data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMentorships();
  }, []);

  const pendingRequests = mentorships.filter(m => m.status === 'Pending');
  const activeMentees = mentorships.filter(m => m.status === 'Accepted').length;
  const sessionsDone = mentorships.filter(m => m.status === 'Completed').length;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-white">
          Alumni Hub
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Give back to your community, {user?.fullName?.split(' ')[0]}.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
        <StatCard label="Active Mentees"   value={loading ? '-' : activeMentees}  icon={Users}        color="amber" />
        <StatCard label="Sessions Done"    value={loading ? '-' : sessionsDone} icon={CalendarCheck} color="emerald" />
        <StatCard label="Pending Requests" value={loading ? '-' : pendingRequests.length} icon={Users} color="blue" />
        <StatCard label="Resources Shared" value="17" icon={Lightbulb}    color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mentorship Requests */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Recent Mentorship Requests"
            subtitle="Students waiting for your guidance"
            action={
              <button 
                onClick={() => navigate(ROUTES.ALUMNI_MENTORSHIP)}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            }
          >
            <div className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-4"><Spinner /></div>
              ) : pendingRequests.length > 0 ? (
                pendingRequests.slice(0, 5).map((req) => (
                  <div
                    key={req._id}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/60 hover:border-amber-500/30 transition-all cursor-pointer"
                    onClick={() => navigate(ROUTES.ALUMNI_MENTORSHIP)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={req.studentId?.fullName} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-100">{req.studentId?.fullName}</p>
                        <p className="text-xs text-slate-500 truncate">{req.topic}</p>
                        {req.requestedSkills && req.requestedSkills.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {req.requestedSkills.map((skill) => (
                              <Badge key={skill} variant="slate" size="sm">{skill}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 mt-2 sm:mt-0 sm:ml-auto">
                      <span className="text-[10px] text-slate-500">{formatDate(req.createdAt)}</span>
                      <button className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:bg-amber-500/20 transition-all font-semibold">
                        Review
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-400">No pending requests right now.</p>
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Quick Actions */}
        <div>
          <SectionCard title="Quick Actions">
            <div className="space-y-3">
              <ActionCard
                label="Manage Mentorships"
                desc="Review requests and schedule sessions"
                icon={Users}
                color="amber"
                onClick={() => navigate(ROUTES.ALUMNI_MENTORSHIP)}
              />
              <ActionCard
                label="Share a Resource"
                desc="Post articles, guides, or tips"
                icon={Lightbulb}
                color="purple"
                onClick={() => {}}
              />
              <ActionCard
                label="Refer a Student"
                desc="Recommend to your network"
                icon={Share2}
                color="emerald"
                onClick={() => {}}
              />
            </div>
          </SectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AlumniDashboard;
