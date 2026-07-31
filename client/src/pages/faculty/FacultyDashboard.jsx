import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Users, ClipboardCheck, PlusCircle, ArrowRight, BookOpen } from 'lucide-react';

import DashboardLayout from '@/layouts/DashboardLayout';
import { StatCard, SectionCard, ActionCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/constants';

const POSTED_PROJECTS = [
  { id: 1, title: 'AI-Powered Crop Prediction',    tech: ['Python', 'TensorFlow'],    applicants: 8,  status: 'active' },
  { id: 2, title: 'Blockchain for Land Registry',  tech: ['Solidity', 'React'],        applicants: 3,  status: 'active' },
  { id: 3, title: 'Smart IoT Campus Management',   tech: ['Node.js', 'MQTT'],          applicants: 12, status: 'review' },
];

const FacultyDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-white">
          Faculty Dashboard
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage your live projects and student collaborations, {user?.fullName?.split(' ')[0]}.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
        <StatCard label="Projects Posted"    value="6"  icon={FolderKanban}   color="purple" />
        <StatCard label="Active Students"    value="23" icon={Users}           color="blue"   trend={4} trendLabel="this week" />
        <StatCard label="Reviews Pending"    value="5"  icon={ClipboardCheck}  color="amber" />
        <StatCard label="Modules Mentored"   value="12" icon={BookOpen}        color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Posted Projects */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Your Posted Projects"
            subtitle="Track student applications and project status"
            action={
              <button
                onClick={() => navigate(ROUTES.CREATE_PROJECT)}
                className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Post New
              </button>
            }
          >
            <div className="space-y-3">
              {POSTED_PROJECTS.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/60 hover:border-slate-700/60 transition-colors cursor-pointer"
                  onClick={() => navigate(ROUTES.PROJECTS)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100 truncate">{p.title}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {p.tech.map((t) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-400 font-mono">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-center hidden sm:block">
                      <p className="text-lg font-bold text-white">{p.applicants}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">Applicants</p>
                    </div>
                    <Badge variant={p.status === 'active' ? 'emerald' : 'amber'} size="sm">
                      {p.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <SectionCard title="Quick Actions">
            <div className="space-y-3">
              <ActionCard
                label="Post a Project"
                desc="Define a new live project for students"
                icon={PlusCircle}
                color="purple"
                onClick={() => navigate(ROUTES.CREATE_PROJECT)}
              />
              <ActionCard
                label="Review Applications"
                desc="5 applications awaiting review"
                icon={ClipboardCheck}
                color="amber"
                onClick={() => navigate(ROUTES.PROJECTS)}
              />
              <ActionCard
                label="Browse Students"
                desc="Discover talented candidates"
                icon={Users}
                color="blue"
                onClick={() => {}}
              />
            </div>
          </SectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FacultyDashboard;
