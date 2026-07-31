import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, PlusCircle, Search, ArrowRight, Tag, Users } from 'lucide-react';

import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { ROLES, ROUTES } from '@/constants';
import { formatDate, getErrorMessage, truncate } from '@/utils/formatters';

const STATUS_COLOR = {
  open:        'emerald',
  in_progress: 'blue',
  completed:   'slate',
  closed:      'rose',
};

const ProjectsList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const canCreate = [ROLES.FACULTY, ROLES.ADMIN].includes(user?.role);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get('/projects');
        setProjects(res.data?.data?.projects || res.data?.data || []);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const filtered = projects.filter((p) =>
    !search || p.title?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <FullPageSpinner message="Loading projects…" />;

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Live Projects</h1>
          <p className="text-slate-400 text-sm mt-1">
            {projects.length} projects available on the platform
          </p>
        </div>
        {canCreate && (
          <Button leftIcon={PlusCircle} onClick={() => navigate(ROUTES.CREATE_PROJECT)}>
            Post Project
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Search projects by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input pl-11 max-w-sm"
        />
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-300 mb-2">No projects found</h3>
          <p className="text-slate-500 text-sm">
            {search ? 'Try a different search term.' : 'No projects have been posted yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((project) => (
            <div
              key={project._id}
              onClick={() => navigate(`/projects/${project._id}`)}
              className="group flex flex-col rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5 cursor-pointer
                         hover:border-blue-500/30 hover:bg-slate-800/40 card-hover"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="text-sm font-bold text-slate-100 group-hover:text-white leading-snug line-clamp-2">
                  {project.title}
                </h3>
                <Badge
                  variant={STATUS_COLOR[project.status] || 'slate'}
                  size="sm"
                  className="flex-shrink-0"
                >
                  {project.status || 'open'}
                </Badge>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-4">
                {project.description || 'No description provided.'}
              </p>

              {/* Tags */}
              {project.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {project.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 border border-slate-700/60 text-slate-400 font-mono">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-800/60">
                <span className="text-[11px] text-slate-500">{formatDate(project.createdAt)}</span>
                <span className="flex items-center gap-1 text-xs font-semibold text-blue-400 group-hover:text-blue-300 transition-colors">
                  View <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default ProjectsList;
