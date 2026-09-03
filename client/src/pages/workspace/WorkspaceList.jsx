import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, ChevronRight, Loader2 } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { getUserWorkspaces } from '@/services/workspaceService';
import { getErrorMessage } from '@/utils/formatters';

const WorkspaceList = () => {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        setLoading(true);
        const res = await getUserWorkspaces();
        setWorkspaces(res.data || []);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    fetchWorkspaces();
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Live Project Workspaces</h1>
            <p className="text-sm text-slate-400">Track active project execution, milestones, deliverable submissions, and verification.</p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Loading your project workspaces...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        ) : workspaces.length === 0 ? (
          <SectionCard className="text-center py-16">
            <FolderKanban className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Active Workspaces</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
              Workspaces are automatically created when candidates are selected for a project application.
            </p>
            <Button onClick={() => navigate('/projects')}>Browse Projects</Button>
          </SectionCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workspaces.map((ws) => (
              <SectionCard
                key={ws._id}
                className="hover:border-slate-700 cursor-pointer transition-all flex flex-col justify-between group"
                onClick={() => navigate(`/workspace/${ws._id}`)}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                        {ws.project?.title || 'Project Workspace'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {ws.project?.description}
                      </p>
                    </div>
                    <Badge variant={ws.status === 'completed' ? 'success' : 'info'}>
                      {ws.status}
                    </Badge>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-400">Milestones Completed</span>
                      <span className="font-bold text-blue-400">{ws.progressPercentage}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500"
                        style={{ width: `${ws.progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Collaborators */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <Avatar src={ws.student?.avatar} name={ws.student?.fullName || 'Student'} size="sm" />
                      <div>
                        <span className="text-slate-400 block text-[10px]">Student</span>
                        <span className="font-semibold text-slate-200">{ws.student?.fullName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-right">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Mentor/Owner</span>
                        <span className="font-semibold text-slate-200">{ws.owner?.fullName}</span>
                      </div>
                      <Avatar src={ws.owner?.avatar} name={ws.owner?.fullName || 'Owner'} size="sm" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 flex items-center justify-end text-xs font-semibold text-blue-400 group-hover:translate-x-1 transition-transform">
                  Enter Workspace <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </SectionCard>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default WorkspaceList;
