import React from 'react';
import { Users, CalendarCheck, Share2, ArrowRight, Lightbulb } from 'lucide-react';

import DashboardLayout from '@/layouts/DashboardLayout';
import { StatCard, SectionCard, ActionCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';

const MENTORSHIP_REQUESTS = [
  { id: 1, name: 'Arjun Nair',     college: 'NIT Calicut',  skill: 'System Design',   time: '2 hours ago' },
  { id: 2, name: 'Sneha Patel',    college: 'VJTI Mumbai',  skill: 'Career Guidance',  time: '1 day ago' },
  { id: 3, name: 'Rohan Das',      college: 'DTU Delhi',    skill: 'Product Management',time: '2 days ago' },
];

const AlumniDashboard = () => {
  const { user } = useAuth();

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
        <StatCard label="Active Mentees"   value="6"  icon={Users}        color="amber" />
        <StatCard label="Sessions Done"    value="24" icon={CalendarCheck} color="emerald" trend={3} trendLabel="this month" />
        <StatCard label="Referrals Sent"   value="9"  icon={Share2}       color="blue" />
        <StatCard label="Resources Shared" value="17" icon={Lightbulb}    color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mentorship Requests */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Pending Mentorship Requests"
            subtitle="Students waiting for your guidance"
            action={
              <button className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            }
          >
            <div className="space-y-3">
              {MENTORSHIP_REQUESTS.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/60 hover:border-amber-500/30 transition-all"
                >
                  <Avatar name={req.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100">{req.name}</p>
                    <p className="text-xs text-slate-500">{req.college}</p>
                    <Badge variant="amber" size="sm" className="mt-1.5">{req.skill}</Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-slate-500 hidden sm:block">{req.time}</span>
                    <button className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:bg-amber-500/20 transition-all font-semibold">
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Quick Actions */}
        <div>
          <SectionCard title="Quick Actions">
            <div className="space-y-3">
              <ActionCard
                label="Accept Mentee"
                desc="Review and accept pending requests"
                icon={Users}
                color="amber"
                onClick={() => {}}
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
