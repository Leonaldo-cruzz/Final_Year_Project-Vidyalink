import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban, Star, Send, UserCircle,
  ArrowRight, Briefcase, Award,
} from 'lucide-react';

import DashboardLayout from '@/layouts/DashboardLayout';
import { StatCard, SectionCard, ActionCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/constants';

const RECENT_ACTIVITY = [
  { id: 1, type: 'project',   text: 'Applied to "AI Crop Prediction System"', time: '2 hours ago',   status: 'pending' },
  { id: 2, type: 'match',     text: 'Skill match found: React + Node.js role', time: '5 hours ago',  status: 'new' },
  { id: 3, type: 'profile',   text: 'Profile completion reached 75%',          time: '1 day ago',    status: 'info' },
  { id: 4, type: 'project',   text: 'Applied to "Blockchain for Supply Chain"', time: '2 days ago',  status: 'approved' },
];

const STATUS_COLOR = {
  pending:  { badge: 'amber',   label: 'Pending' },
  new:      { badge: 'blue',    label: 'New' },
  info:     { badge: 'slate',   label: 'Info' },
  approved: { badge: 'emerald', label: 'Approved' },
};

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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
        <StatCard label="Active Projects"    value="3"   icon={FolderKanban} color="blue"    trend={12}  trendLabel="this month" />
        <StatCard label="Skill Matches"      value="14"  icon={Star}         color="amber"   trend={8}   trendLabel="this week" />
        <StatCard label="Applications Sent"  value="7"   icon={Send}         color="emerald" trend={5}   trendLabel="this month" />
        <StatCard label="Profile Score"      value="75%" icon={Award}        color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Recent Activity"
            subtitle="Your latest interactions on the platform"
            action={
              <button className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            }
          >
            <ul className="space-y-3">
              {RECENT_ACTIVITY.map((item) => {
                const { badge, label } = STATUS_COLOR[item.status] || STATUS_COLOR.info;
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 hover:border-slate-700/60 transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    <p className="text-sm text-slate-200 flex-1 min-w-0 truncate">{item.text}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={badge} size="sm">{label}</Badge>
                      <span className="text-[11px] text-slate-500 hidden sm:block">{item.time}</span>
                    </div>
                  </li>
                );
              })}
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
                label="Explore Careers"
                desc="Find recruiter opportunities"
                icon={Briefcase}
                color="emerald"
                onClick={() => {}}
              />
            </div>
          </SectionCard>

          {/* Profile Completion */}
          <SectionCard title="Profile Completion">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Overall Score</span>
                <span className="font-bold text-blue-400">75%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-700"
                  style={{ width: '75%' }}
                />
              </div>
              <div className="space-y-1.5">
                {[
                  { label: 'Basic Info',      done: true },
                  { label: 'Skills Added',    done: true },
                  { label: 'GitHub Linked',   done: false },
                  { label: 'Resume Uploaded', done: false },
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
