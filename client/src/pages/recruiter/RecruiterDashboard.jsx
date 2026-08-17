import React, { useState, useEffect } from 'react';
import { Users, Bookmark, Briefcase, Search, Star, ArrowRight, FolderKanban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import DashboardLayout from '@/layouts/DashboardLayout';
import { StatCard, SectionCard, ActionCard } from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { getMyProjects } from '@/services/projectService';
import { ROUTES } from '@/constants';

const TALENT_POOL = [
  { id: 1, name: 'Priya Sharma',    role: 'student', skills: ['React', 'TypeScript', 'Node.js'],  score: 92, college: 'IIT Bombay' },
  { id: 2, name: 'Rahul Mehta',     role: 'student', skills: ['Python', 'ML', 'Pandas'],          score: 88, college: 'NIT Trichy' },
  { id: 3, name: 'Ananya Joshi',    role: 'student', skills: ['Flutter', 'Dart', 'Firebase'],     score: 85, college: 'BITS Pilani' },
  { id: 4, name: 'Karan Verma',     role: 'student', skills: ['Java', 'Spring Boot', 'AWS'],      score: 90, college: 'VIT Vellore' },
];

const RecruiterDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [myProjects, setMyProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const data = await getMyProjects();
        setMyProjects(data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-white">
          Talent Acquisition Hub
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Discover and shortlist top academic talent, {user?.fullName?.split(' ')[0]}.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
        <StatCard label="Talent Viewed"   value="148" icon={Users}     color="emerald" trend={22} trendLabel="this week" />
        <StatCard label="Shortlisted"     value="31"  icon={Bookmark}  color="blue" />
        <StatCard label="Open Roles"      value={loading ? '-' : myProjects.length}   icon={Briefcase} color="amber" />
        <StatCard label="Avg Match Score" value="87%" icon={Star}      color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Talent Pool */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Top Matching Talent (AI Suggestions)"
            subtitle="Sorted by AI skill-match score"
            action={
              <button className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            }
          >
            <div className="space-y-3">
              {TALENT_POOL.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/60 hover:border-emerald-500/30 transition-all cursor-pointer group"
                >
                  <Avatar name={candidate.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100 group-hover:text-white">{candidate.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{candidate.college}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {candidate.skills.slice(0, 3).map((s) => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 border border-slate-700/60 text-slate-400 font-mono">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-center">
                    <div className="text-lg font-extrabold text-emerald-400">{candidate.score}%</div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">Match</p>
                    <button className="mt-1.5 text-[10px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-emerald-600/20 text-slate-400 hover:text-emerald-400 border border-slate-700 hover:border-emerald-500/40 transition-all font-semibold">
                      Shortlist
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
                label="Post a Role"
                desc="Publish a new job or internship"
                icon={Briefcase}
                color="amber"
                onClick={() => navigate(ROUTES.CREATE_PROJECT)}
              />
              <ActionCard
                label="My Roles"
                desc="Manage your posted opportunities"
                icon={FolderKanban}
                color="emerald"
                onClick={() => navigate(ROUTES.PROJECTS)}
              />
              <ActionCard
                label="Shortlisted Profiles"
                desc="Review your saved candidates"
                icon={Bookmark}
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

export default RecruiterDashboard;
