import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban, Star, Send, UserCircle,
  ArrowRight, Briefcase, Award, Clock
} from 'lucide-react';

import DashboardLayout from '@/layouts/DashboardLayout';
import { StatCard, SectionCard, ActionCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { getStudentApplications } from '@/services/applicationService';
import { getMyProjects } from '@/services/projectService';
import api from '@/services/api';
import { ROUTES } from '@/constants';
import { formatDate } from '@/utils/formatters';

const STATUS_COLOR = {
  'Applied':  { badge: 'blue',   label: 'Applied' },
  'Under Review':      { badge: 'amber',    label: 'Under Review' },
  'Shortlisted':     { badge: 'purple',   label: 'Shortlisted' },
  'Interview Scheduled': { badge: 'amber', label: 'Interview Scheduled' },
  'Selected': { badge: 'emerald', label: 'Selected' },
  'Rejected': { badge: 'rose', label: 'Rejected' },
  'Withdrawn': { badge: 'slate', label: 'Withdrawn' },
};

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [projects, setProjects] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [appData, projData, profData] = await Promise.all([
          getStudentApplications(),
          getMyProjects(),
          api.get('/profile/me'),
        ]);
        setApplications(appData.data || []);
        setProjects(projData.data || []);
        setProfile(profData.data?.data || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const profileScore = profile?.profileCompletion || 0;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-white">
          Good morning, {user?.fullName?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Here's what's happening with your VidyaLink activity today.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
        <StatCard label="Active Projects"    value={loading ? '-' : projects.length}   icon={FolderKanban} color="blue" />
        <StatCard label="Skill Matches"      value="14"  icon={Star}         color="amber" />
        <StatCard label="Applications Sent"  value={loading ? '-' : applications.length}   icon={Send}         color="emerald" />
        <StatCard label="Profile Score"      value={`${profileScore}%`} icon={Award}        color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Recent Applications"
            subtitle="Your latest interactions on the platform"
            action={
              <button 
                onClick={() => navigate('/dashboard/student')}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            }
          >
            <ul className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-4"><Spinner /></div>
              ) : applications.length > 0 ? (
                applications.slice(0, 5).map((app) => {
                  const { badge, label } = STATUS_COLOR[app.status] || { badge: 'slate', label: app.status };
                  return (
                    <li
                      key={app._id}
                      className="flex flex-col sm:flex-row sm:items-center gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 hover:border-slate-700/60 transition-colors cursor-pointer"
                      onClick={() => navigate(`/projects/${app.project?._id || app.projectOpportunityId}`)}
                    >
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 hidden sm:block" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-200 truncate">{app.project?.title || 'Unknown Project'}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{app.project?.shortDescription}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 mt-2 sm:mt-0">
                        <Badge variant={badge} size="sm">{label}</Badge>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(app.createdAt)}</span>
                      </div>
                    </li>
                  );
                })
              ) : (
                <p className="text-center text-sm text-slate-500 py-4">No recent applications found.</p>
              )}
            </ul>
          </SectionCard>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <SectionCard title="Quick Actions">
            <div className="space-y-3">
              <ActionCard
                label="Browse Projects"
                desc="Discover industry live projects"
                icon={FolderKanban}
                color="blue"
                onClick={() => navigate(ROUTES.PROJECTS)}
              />
              <ActionCard
                label="Update Profile"
                desc="Boost your profile score"
                icon={UserCircle}
                color="purple"
                onClick={() => navigate(ROUTES.PROFILE)}
              />
              <ActionCard
                label="My Applications"
                desc="Check application statuses"
                icon={Send}
                color="emerald"
                onClick={() => navigate('/dashboard/student')} // You can route to StudentApplications component if it has a route
              />
            </div>
          </SectionCard>

          {/* Profile Completion */}
          <SectionCard title="Profile Completion">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Overall Score</span>
                <span className="font-bold text-blue-400">{profileScore}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-700"
                  style={{ width: `${profileScore}%` }}
                />
              </div>
              <div className="space-y-1.5">
                {[
                  { label: 'Basic Info',      done: profileScore > 10 },
                  { label: 'Skills Added',    done: profile?.skills?.length > 0 },
                  { label: 'Bio Added',   done: !!profile?.bio },
                  { label: 'Contact Info', done: !!profile?.contactEmail },
                ].map(({ label, done }) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-600'}`}>
                      {done ? '✓' : '○'}
                    </div>
                    <span className={done ? 'text-slate-300' : 'text-slate-500'}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
