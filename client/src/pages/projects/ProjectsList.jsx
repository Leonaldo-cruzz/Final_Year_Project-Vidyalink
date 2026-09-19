import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  FolderKanban,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import DashboardLayout from '@/layouts/DashboardLayout';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import ProjectCard from '@/components/projects/ProjectCard';
import { deleteProject, getProjects, updateProject } from '@/services/projectService';
import { getErrorMessage, pluralize } from '@/utils/formatters';

const FILTERS = ['All', 'Verified', 'Pending', 'Completed', 'In Progress', 'Featured'];
const SORT_OPTIONS = ['Newest', 'Oldest', 'A-Z', 'Recently Updated'];

const ProjectsSkeleton = () => (
  <div data-testid="projects-loading" className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
    {[1, 2, 3].map((i) => (
      <Card key={i} className="animate-pulse overflow-hidden">
        <div className="aspect-[16/9] bg-slate-800" />
        <div className="p-5 space-y-3">
          <div className="flex gap-2">
            <div className="h-5 w-16 rounded bg-slate-800" />
            <div className="h-5 w-16 rounded bg-slate-800" />
          </div>
          <div className="h-6 w-3/4 rounded bg-slate-800" />
          <div className="h-4 w-full rounded bg-slate-800" />
          <div className="h-4 w-2/3 rounded bg-slate-800" />
          <div className="pt-4 border-t border-slate-800 flex justify-between">
            <div className="h-7 w-20 rounded bg-slate-800" />
            <div className="h-7 w-16 rounded bg-slate-800" />
          </div>
        </div>
      </Card>
    ))}
  </div>
);

const ProjectsList = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Distinguish explicitly between:
  // loading: true / false
  // error: string message
  // projects: null (uninitialized) | Array (success with zero or more records)
  const [projects, setProjects] = useState(null);
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState('Newest');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [projectToDelete, setProjectToDelete] = useState(null);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getProjects({
        ...(filter !== 'All' ? { filter } : {}),
        ...(search ? { search } : {}),
        sort,
      });

      // Safely extract the project list from the API response without fake fallbacks
      const projectList = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.projects)
        ? response.data.projects
        : Array.isArray(response?.projects)
        ? response.projects
        : [];

      setProjects(projectList);
    } catch (requestError) {
      // Do NOT set projects = [] as a fallback that hides the error
      setError(getErrorMessage(requestError, 'Unable to load your projects.'));
    } finally {
      setLoading(false);
    }
  }, [filter, search, sort]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const projectList = useMemo(() => {
    return Array.isArray(projects) ? projects : [];
  }, [projects]);

  const counts = useMemo(() => ({
    total: projectList.length,
    verified: projectList.filter((project) => project.verificationStatus === 'Verified').length,
    featured: projectList.filter((project) => project.featured).length,
  }), [projectList]);

  const handleSearch = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleClearFilters = () => {
    setFilter('All');
    setSearch('');
    setSearchInput('');
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;
    try {
      setDeleting(true);
      await deleteProject(projectToDelete._id);
      setProjects((current) =>
        Array.isArray(current)
          ? current.filter((project) => project._id !== projectToDelete._id)
          : []
      );
      setProjectToDelete(null);
      setNotice('Project deleted successfully.');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to delete project'));
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleFeatured = async (project) => {
    try {
      const response = await updateProject(project._id, { featured: !project.featured });
      const updated = response?.data || response;
      setProjects((current) =>
        Array.isArray(current)
          ? current.map((item) => (item._id === project._id ? updated : item))
          : []
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to update featured status'));
    }
  };

  const isFiltered = Boolean(search || filter !== 'All');

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Top Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="page-title text-white">My Project Portfolio</h1>
              {!loading && !error && projects !== null && (
                <span
                  className="status-badge status-badge-sm"
                  style={{ '--badge-tone': 'var(--color-accent)' }}
                >
                  {counts.total} {pluralize(counts.total, 'project')}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Showcase the work that makes your skills stand out.
            </p>
          </div>

          <Button leftIcon={Plus} onClick={() => navigate('/projects/new')}>
            Add Project
          </Button>
        </div>

        {notice && (
          <div
            role="status"
            className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
          >
            {notice}
          </div>
        )}

        {/* Filter / Search Bar */}
        <Card className="p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <form onSubmit={handleSearch} className="flex w-full gap-2 xl:max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search projects, domains, technologies..."
                  className="form-input pl-10"
                />
              </div>
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <SlidersHorizontal className="h-4 w-4 flex-shrink-0 text-slate-500" />
                {FILTERS.map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => setFilter(item)}
                    className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold transition ${
                      filter === item
                        ? 'bg-orange-400 text-slate-950'
                        : 'bg-slate-800/70 text-slate-400 hover:text-white'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="form-input h-10 w-full text-xs sm:w-auto"
              >
                {SORT_OPTIONS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Content Body: Loading / Error / Empty / Populated List */}
        {loading ? (
          <ProjectsSkeleton />
        ) : error ? (
          <Card className="py-16 text-center" role="alert">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h2 className="text-base font-bold text-white">Unable to load your projects.</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              {error}
            </p>
            <Button
              className="mt-5"
              variant="secondary"
              leftIcon={RefreshCw}
              onClick={loadProjects}
            >
              Retry
            </Button>
          </Card>
        ) : projectList.length === 0 ? (
          <Card className="py-16 text-center">
            <FolderKanban className="mx-auto mb-4 h-12 w-12 text-slate-600" />
            <h2 className="text-base font-bold text-white">
              {isFiltered ? 'No matching projects' : 'Your portfolio is empty'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              {isFiltered
                ? 'Try another search or filter.'
                : 'Add your first project to start building your professional portfolio.'}
            </p>
            {isFiltered ? (
              <Button
                className="mt-5"
                variant="secondary"
                leftIcon={X}
                onClick={handleClearFilters}
              >
                Clear search and filters
              </Button>
            ) : (
              <Button
                className="mt-5"
                leftIcon={Plus}
                onClick={() => navigate('/projects/new')}
              >
                Create your first project
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projectList.map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                onView={(item) => navigate(`/projects/${item._id}`)}
                onEdit={(item) => navigate(`/projects/${item._id}/edit`)}
                onDelete={setProjectToDelete}
                onToggleFeatured={handleToggleFeatured}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        open={Boolean(projectToDelete)}
        onClose={() => setProjectToDelete(null)}
        title="Delete project"
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setProjectToDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={handleDelete}
            >
              Delete project
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-300">
          Delete <span className="font-semibold text-white">{projectToDelete?.title}</span>? This removes the portfolio entry and its uploaded screenshots.
        </p>
      </Modal>
    </DashboardLayout>
  );
};

export { ProjectsList as Projects };
export default ProjectsList;
