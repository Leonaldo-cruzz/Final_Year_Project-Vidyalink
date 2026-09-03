import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, PlusCircle, Search, Loader2, Send } from 'lucide-react';

import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProjectCard from '@/components/projects/ProjectCard';
import ProjectDetailModal from '@/components/projects/ProjectDetailModal';
import ApplyProjectModal from '@/components/applications/ApplyProjectModal';
import { useAuth } from '@/context/AuthContext';
import { getProjects, deleteProject } from '@/services/projectService';
import { getStudentApplications } from '@/services/applicationService';
import { ROLES, ROUTES } from '@/constants';
import { getErrorMessage } from '@/utils/formatters';

const DOMAIN_OPTIONS = [
  'all',
  'Software Development',
  'AI / Machine Learning',
  'Web Development',
  'Mobile Development',
  'Data Science',
  'DevOps',
];

const DIFFICULTY_OPTIONS = ['all', 'Beginner', 'Intermediate', 'Advanced'];
const MODE_OPTIONS = ['all', 'Remote', 'Hybrid', 'In-office'];

const ProjectsList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('marketplace'); // 'marketplace' | 'my-projects' | 'my-applications'
  const [projects, setProjects] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters state
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');

  // Modals state
  const [selectedDetailProject, setSelectedDetailProject] = useState(null);
  const [applyModalProject, setApplyModalProject] = useState(null);

  const isStudent = user?.role === ROLES.STUDENT;
  const isRecruiter = [ROLES.RECRUITER, ROLES.FACULTY, ROLES.ADMIN].includes(user?.role);

  const fetchProjectsData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      if (activeTab === 'my-projects') {
        const res = await getProjects();
        setProjects(res.data || []);
      } else if (activeTab === 'my-applications') {
        const res = await getStudentApplications();
        setMyApplications(res.data || []);
      } else {
        const res = await getProjects({
          search: search || undefined,
          domain: domainFilter !== 'all' ? domainFilter : undefined,
          difficulty: difficultyFilter !== 'all' ? difficultyFilter : undefined,
          mode: modeFilter !== 'all' ? modeFilter : undefined,
        });
        setProjects(res.data || []);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, domainFilter, difficultyFilter, modeFilter]);

  useEffect(() => {
    fetchProjectsData();
  }, [fetchProjectsData]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProjectsData();
  };

  const handleDeleteProject = async (proj) => {
    if (!window.confirm(`Are you sure you want to delete "${proj.title}"?`)) return;
    try {
      await deleteProject(proj._id);
      fetchProjectsData();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Live Project Marketplace</h1>
            <p className="text-sm text-slate-400">Discover live industry projects, apply for internships, and build verified portfolios.</p>
          </div>

          <div className="flex items-center gap-3">
            {isRecruiter && (
              <Button leftIcon={PlusCircle} onClick={() => navigate(ROUTES.CREATE_PROJECT)}>
                Post Project
              </Button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'marketplace'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Explore Marketplace
            </button>

            {isStudent && (
              <button
                onClick={() => setActiveTab('my-applications')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'my-applications'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                My Applications
              </button>
            )}

            {isRecruiter && (
              <button
                onClick={() => setActiveTab('my-projects')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'my-projects'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                Manage My Projects
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar (Marketplace tab) */}
        {activeTab === 'marketplace' && (
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* Search */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search projects, skills, or companies…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input pl-10"
              />
            </div>

            {/* Domain Filter */}
            <div>
              <select
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                className="form-input capitalize"
              >
                {DOMAIN_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d === 'all' ? 'All Domains' : d}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="form-input"
              >
                {DIFFICULTY_OPTIONS.map((diff) => (
                  <option key={diff} value={diff}>
                    {diff === 'all' ? 'All Difficulties' : diff}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode Filter */}
            <div>
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="form-input"
              >
                {MODE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m === 'all' ? 'All Work Modes' : m}
                  </option>
                ))}
              </select>
            </div>
          </form>
        )}

        {/* Content Body */}
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Loading project listings...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        ) : activeTab === 'my-applications' ? (
          /* Student My Applications View */
          myApplications.length === 0 ? (
            <SectionCard className="text-center py-16">
              <Send className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No Applications Submitted</h3>
              <p className="text-sm text-slate-400 mb-6">Explore the marketplace and apply for live industry projects.</p>
              <Button onClick={() => setActiveTab('marketplace')}>Browse Marketplace</Button>
            </SectionCard>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {myApplications.map((app) => (
                <SectionCard key={app._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">{app.project?.title || 'Project'}</h3>
                    <p className="text-xs text-slate-400">{app.project?.company} • {app.project?.domain}</p>
                    <p className="text-xs text-slate-300 italic pt-1">Pitch: "{app.pitch}"</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold capitalize ${
                      app.status === 'selected' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      app.status === 'shortlisted' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      app.status === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                      {app.status}
                    </span>
                    {app.status === 'selected' && (
                      <Button size="sm" onClick={() => navigate('/workspaces')}>
                        Open Workspace
                      </Button>
                    )}
                  </div>
                </SectionCard>
              ))}
            </div>
          )
        ) : projects.length === 0 ? (
          <SectionCard className="text-center py-16">
            <FolderKanban className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Projects Found</h3>
            <p className="text-sm text-slate-400">
              {activeTab === 'my-projects'
                ? "You haven't posted any projects yet."
                : 'No projects match your current filters.'}
            </p>
            {isRecruiter && activeTab === 'my-projects' && (
              <Button className="mt-4" leftIcon={PlusCircle} onClick={() => navigate(ROUTES.CREATE_PROJECT)}>
                Post Project
              </Button>
            )}
          </SectionCard>
        ) : (
          /* Projects Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                isStudent={isStudent}
                isRecruiter={isRecruiter}
                onApply={(p) => setApplyModalProject(p)}
                onViewDetails={(p) => setSelectedDetailProject(p)}
                onViewApplicants={(p) => navigate(`/projects/${p._id}/applicants`)}
                onDelete={activeTab === 'my-projects' ? handleDeleteProject : undefined}
              />
            ))}
          </div>
        )}

        {/* Modals */}
        <ProjectDetailModal
          open={Boolean(selectedDetailProject)}
          onClose={() => setSelectedDetailProject(null)}
          project={selectedDetailProject}
          isStudent={isStudent}
          onApply={(p) => setApplyModalProject(p)}
        />

        <ApplyProjectModal
          open={Boolean(applyModalProject)}
          onClose={() => setApplyModalProject(null)}
          project={applyModalProject}
          onSuccess={() => {
            alert('Application submitted successfully!');
            fetchProjectsData();
          }}
        />
      </div>
    </DashboardLayout>
  );
};

export default ProjectsList;
