import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StatCard, SectionCard, ActionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import alumniService from '@/services/alumniService';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/constants';
import {
  Users, CalendarCheck, Share2, MessageSquare, ArrowRight,
  Lightbulb, Award, CheckCircle2, Video, Sparkles, Building2,
} from 'lucide-react';

const AlumniDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await alumniService.getDashboardStats();
      setData(res);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  const stats = data?.stats || {};
  const pendingRequests = data?.pendingRequests || [];
  const upcomingInterviews = data?.upcomingInterviews || [];
  const recentReferrals = data?.recentReferrals || [];
  const recommendedStudents = data?.recommendedStudents || [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white">
              Alumni Mentorship & Recruitment Hub
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Welcome back, {user?.fullName?.split(' ')[0]}. Here is your ecosystem overview.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => navigate(ROUTES.ALUMNI_STUDENTS)}>
              <Users className="w-4 h-4 mr-1.5" /> Discover Students
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-sm">
            {error}
          </div>
        )}

        {/* 5 Real Dynamic Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            label="Students Mentored"
            value={String(stats.studentsMentored ?? 0)}
            icon={Users}
            color="emerald"
          />
          <StatCard
            label="Pending Mentorships"
            value={String(stats.pendingMentorships ?? 0)}
            icon={MessageSquare}
            color="amber"
          />
          <StatCard
            label="Endorsements Given"
            value={String(stats.endorsementsGiven ?? 0)}
            icon={Award}
            color="purple"
          />
          <StatCard
            label="Active Referrals"
            value={String(stats.activeReferrals ?? 0)}
            icon={Share2}
            color="blue"
          />
          <StatCard
            label="Mock Interviews"
            value={String(stats.upcomingMockInterviews ?? 0)}
            icon={CalendarCheck}
            color="rose"
          />
        </div>

        {/* Main Grid: Pending Requests & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Mentorship Requests */}
          <div className="lg:col-span-2">
            <SectionCard
              title="Pending Mentorship Requests"
              subtitle="Students waiting for your review and guidance"
              action={
                <button
                  onClick={() => navigate(ROUTES.ALUMNI_MENTORSHIP)}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </button>
              }
            >
              {pendingRequests.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800/80">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400/80 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">All mentorship requests are cleared!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((req) => (
                    <div
                      key={req._id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/60 hover:border-amber-500/30 transition-all"
                    >
                      <Avatar name={req.student?.fullName || 'Student'} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-100">{req.student?.fullName}</p>
                        <p className="text-xs text-slate-400">{req.student?.college}</p>
                        <Badge variant="amber" size="sm" className="mt-1.5">{req.topic}</Badge>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => navigate(ROUTES.ALUMNI_MENTORSHIP)}
                        >
                          Review Request
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {/* Quick Actions Panel */}
          <div>
            <SectionCard title="Quick Actions">
              <div className="space-y-3">
                <ActionCard
                  label="Discover Verified Students"
                  desc="Filter by project verification & skills"
                  icon={Users}
                  color="amber"
                  onClick={() => navigate(ROUTES.ALUMNI_STUDENTS)}
                />
                <ActionCard
                  label="Manage Mock Interviews"
                  desc="Schedule online or campus drills"
                  icon={CalendarCheck}
                  color="purple"
                  onClick={() => navigate(ROUTES.ALUMNI_MOCK_INTERVIEWS)}
                />
                <ActionCard
                  label="Refer Candidates"
                  desc="Submit & track job referrals"
                  icon={Share2}
                  color="emerald"
                  onClick={() => navigate(ROUTES.ALUMNI_REFERRALS)}
                />
                <ActionCard
                  label="Skill Endorsements"
                  desc="Verify student domain proficiencies"
                  icon={Award}
                  color="blue"
                  onClick={() => navigate(ROUTES.ALUMNI_ENDORSEMENTS)}
                />
              </div>
            </SectionCard>
          </div>
        </div>

        {/* Recommended Students Row */}
        <SectionCard
          title="Recommended Verified Candidates"
          subtitle="Top students with faculty-evaluated milestones and AI match readiness"
          action={
            <button
              onClick={() => navigate(ROUTES.ALUMNI_STUDENTS)}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              Explore all students <ArrowRight className="w-3 h-3" />
            </button>
          }
        >
          {recommendedStudents.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No candidates found currently.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recommendedStudents.map((st) => (
                <div
                  key={st._id}
                  onClick={() => navigate(`/alumni/students/${st._id}`)}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start gap-3 mb-2">
                      <Avatar name={st.fullName} size="md" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-100 truncate">{st.fullName}</h4>
                        <p className="text-[11px] text-slate-400 truncate">{st.branch}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold my-2">
                      <Sparkles className="w-3.5 h-3.5" /> {st.industryReadinessScore}% AI Readiness
                    </div>

                    <div className="flex flex-wrap gap-1 max-h-12 overflow-hidden">
                      {(st.skills || []).slice(0, 3).map((sk) => (
                        <span key={sk} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 text-right mt-3">
                    <span className="text-xs text-amber-400 hover:underline font-semibold inline-flex items-center gap-1">
                      View Profile <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Bottom Dual Grid: Upcoming Interviews & Recent Referrals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Interviews */}
          <SectionCard
            title="Upcoming Mock Interviews"
            subtitle="Scheduled technical mock interview sessions"
            action={
              <button
                onClick={() => navigate(ROUTES.ALUMNI_MOCK_INTERVIEWS)}
                className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            }
          >
            {upcomingInterviews.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 text-center">No upcoming interviews scheduled.</p>
            ) : (
              <div className="space-y-3">
                {upcomingInterviews.map((iv) => (
                  <div key={iv._id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={iv.student?.fullName || 'Student'} size="sm" />
                      <div>
                        <p className="text-xs font-bold text-slate-200">{iv.student?.fullName}</p>
                        <p className="text-[11px] text-purple-400">{iv.roleTarget} • {iv.mode}</p>
                      </div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.ALUMNI_MOCK_INTERVIEWS)}>
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Recent Referrals */}
          <SectionCard
            title="Recent Referrals"
            subtitle="Pipeline status for referred candidates"
            action={
              <button
                onClick={() => navigate(ROUTES.ALUMNI_REFERRALS)}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            }
          >
            {recentReferrals.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 text-center">No recent referrals recorded.</p>
            ) : (
              <div className="space-y-3">
                {recentReferrals.map((rf) => (
                  <div key={rf._id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={rf.student?.fullName || 'Student'} size="sm" />
                      <div>
                        <p className="text-xs font-bold text-slate-200">{rf.student?.fullName}</p>
                        <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {rf.company} — {rf.jobTitle}
                        </p>
                      </div>
                    </div>
                    <Badge variant="blue" size="sm">{rf.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AlumniDashboard;
