import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
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
import { useAuth } from '@/context/AuthContext';
import { deleteProject, getProjects, updateProject } from '@/services/projectService';
import { getErrorMessage, pluralize } from '@/utils/formatters';

const FILTERS = ['All', 'Verified', 'Pending', 'Completed', 'In Progress', 'Featured'];
const SORT_OPTIONS = ['Newest', 'Oldest', 'A-Z', 'Recently Updated'];
const CATEGORY_OPTIONS = [
  'All',
  'Web Development',
  'Mobile App',
  'AI / ML',
  'Cloud',
  'Cyber Security',
  'IoT',
  'Blockchain',
  'Desktop Application',
  'Research',
  'Other',
];

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

  const { user } = useAuth();
  const isRecruiter = user?.role === 'recruiter' || user?.role === 'alumni';

  // Distinguish explicitly between:
  // loading: true / false
  // error: string message
  // projects: null (uninitialized) | Array (success with zero or more records)
  const [projects, setProjects] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1, hasMore: false });
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState('Newest');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Recruiter candidate filters
  const [branch, setBranch] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [minAiScore, setMinAiScore] = useState('');
  const [maxAiScore, setMaxAiScore] = useState('');
  const [category, setCategory] = useState('All');
  const [technology, setTechnology] = useState('');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [projectToDelete, setProjectToDelete] = useState(null);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        ...(filter !== 'All' ? { filter } : {}),
        ...(search ? { search } : {}),
        ...(branch ? { branch } : {}),
        ...(graduationYear ? { graduationYear: Number(graduationYear) } : {}),
        ...(minAiScore !== '' ? { minAiScore: Number(minAiScore) } : {}),
        ...(maxAiScore !== '' ? { maxAiScore: Number(maxAiScore) } : {}),
        ...(category && category !== 'All' ? { category } : {}),
        ...(technology ? { technology } : {}),
        sort,
        page,
        limit: 12,
      };

      const response = await getProjects(params);

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

      const paginationMeta = response?.data?.pagination || response?.pagination || {
        total: response?.data?.total ?? response?.total ?? projectList.length,
        page: response?.data?.page ?? response?.page ?? page,
        limit: response?.data?.limit ?? response?.limit ?? 12,
        totalPages: response?.data?.totalPages ?? response?.totalPages ?? Math.max(1, Math.ceil(projectList.length / 12)),
        hasMore: response?.data?.hasMore ?? response?.hasMore ?? false,
      };

      setProjects(projectList);
      setPagination(paginationMeta);
    } catch (requestError) {
      // Do NOT set projects = [] as a fallback that hides the error
      setError(getErrorMessage(requestError, 'Unable to load your projects.'));
    } finally {
      setLoading(false);
    }
  }, [filter, search, branch, graduationYear, minAiScore, maxAiScore, category, technology, sort, page]);

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

  const counts = useMemo(() => {
    const totalCount = pagination.total ?? projectList.length;
    return {
      total: totalCount,
      verified: projectList.filter((project) => project.verificationStatus === 'Verified').length,
      featured: projectList.filter((project) => project.featured).length,
    };
  }, [projectList, pagination.total]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleClearFilters = () => {
    setFilter('All');
    setSearch('');
    setSearchInput('');
    setBranch('');
    setGraduationYear('');
    setMinAiScore('');
    setMaxAiScore('');
    setCategory('All');
    setTechnology('');
    setPage(1);
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

  const isFiltered = Boolean(
    search ||
    (filter !== 'All' && !isRecruiter) ||
    branch ||
    graduationYear ||
    minAiScore !== '' ||
    maxAiScore !== '' ||
    (category && category !== 'All') ||
    technology
  );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Top Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="page-title text-white">
                {isRecruiter ? 'Verified Candidate Talent Discovery' : 'My Project Portfolio'}
              </h1>
              {!loading && !error && projects !== null && (
                <span
                  className="status-badge status-badge-sm"
                  style={{ '--badge-tone': 'var(--color-accent)' }}
                >
                  {counts.total} {pluralize(counts.total, isRecruiter ? 'verified project' : 'project')}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-400">
              {isRecruiter
                ? 'Discover faculty-verified student projects with authentic AI evaluations and academic evidence.'
                : 'Showcase the work that makes your skills stand out.'}
            </p>
          </div>

          {!isRecruiter && (
            <Button leftIcon={Plus} onClick={() => navigate('/projects/new')}>
              Add Project
            </Button>
          )}
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
        <Card className="p-4 space-y-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <form onSubmit={handleSearch} className="flex w-full gap-2 xl:max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={
                    isRecruiter
                      ? 'Search title, technologies, keywords...'
                      : 'Search projects, domains, technologies...'
                  }
                  className="form-input pl-10"
                />
              </div>
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {!isRecruiter && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <SlidersHorizontal className="h-4 w-4 flex-shrink-0 text-slate-500" />
                  {FILTERS.map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => {
                        setFilter(item);
                        setPage(1);
                      }}
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
              )}
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setPage(1);
                }}
                className="form-input h-10 w-full text-xs sm:w-auto"
                aria-label="Sort projects"
              >
                {SORT_OPTIONS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Recruiter Candidate Discovery Server-Side Filters */}
          {isRecruiter && (
            <div className="pt-3 border-t border-slate-800/80">
              <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Filter className="w-3.5 h-3.5 text-orange-400" />
                Server-Side Candidate Filters
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                {/* Branch */}
                <div>
                  <label htmlFor="filter-branch" className="block text-[11px] font-medium text-slate-400 mb-1">
                    Student Branch
                  </label>
                  <input
                    id="filter-branch"
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={branch}
                    onChange={(e) => {
                      setBranch(e.target.value);
                      setPage(1);
                    }}
                    className="form-input text-xs h-9 w-full"
                  />
                </div>

                {/* Graduation Year */}
                <div>
                  <label htmlFor="filter-grad-year" className="block text-[11px] font-medium text-slate-400 mb-1">
                    Graduation Year
                  </label>
                  <input
                    id="filter-grad-year"
                    type="number"
                    placeholder="e.g. 2027"
                    value={graduationYear}
                    onChange={(e) => {
                      setGraduationYear(e.target.value);
                      setPage(1);
                    }}
                    className="form-input text-xs h-9 w-full"
                  />
                </div>

                {/* Min AI Score */}
                <div>
                  <label htmlFor="filter-min-ai" className="block text-[11px] font-medium text-slate-400 mb-1">
                    Min AI Score (0-100)
                  </label>
                  <input
                    id="filter-min-ai"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Min score"
                    value={minAiScore}
                    onChange={(e) => {
                      setMinAiScore(e.target.value);
                      setPage(1);
                    }}
                    className="form-input text-xs h-9 w-full"
                  />
                </div>

                {/* Max AI Score */}
                <div>
                  <label htmlFor="filter-max-ai" className="block text-[11px] font-medium text-slate-400 mb-1">
                    Max AI Score (0-100)
                  </label>
                  <input
                    id="filter-max-ai"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Max score"
                    value={maxAiScore}
                    onChange={(e) => {
                      setMaxAiScore(e.target.value);
                      setPage(1);
                    }}
                    className="form-input text-xs h-9 w-full"
                  />
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="filter-category" className="block text-[11px] font-medium text-slate-400 mb-1">
                    Project Category
                  </label>
                  <select
                    id="filter-category"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setPage(1);
                    }}
                    className="form-input text-xs h-9 w-full"
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Technology */}
                <div>
                  <label htmlFor="filter-tech" className="block text-[11px] font-medium text-slate-400 mb-1">
                    Technology
                  </label>
                  <input
                    id="filter-tech"
                    type="text"
                    placeholder="e.g. React, Python"
                    value={technology}
                    onChange={(e) => {
                      setTechnology(e.target.value);
                      setPage(1);
                    }}
                    className="form-input text-xs h-9 w-full"
                  />
                </div>
              </div>

              {isFiltered && (
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    leftIcon={X}
                    onClick={handleClearFilters}
                  >
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          )}
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
              {isFiltered
                ? 'No matching projects'
                : isRecruiter
                ? 'No verified candidate projects found'
                : 'Your portfolio is empty'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              {isFiltered
                ? 'Try another search or filter.'
                : isRecruiter
                ? 'Candidate projects will appear here once faculty verifies their capstones.'
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
            ) : !isRecruiter ? (
              <Button
                className="mt-5"
                leftIcon={Plus}
                onClick={() => navigate('/projects/new')}
              >
                Create your first project
              </Button>
            ) : null}
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {projectList.map((project) => (
                <ProjectCard
                  key={project._id}
                  project={project}
                  onView={(item) => navigate(`/projects/${item._id}`)}
                  onEdit={!isRecruiter ? (item) => navigate(`/projects/${item._id}/edit`) : undefined}
                  onDelete={!isRecruiter ? setProjectToDelete : undefined}
                  onToggleFeatured={!isRecruiter ? handleToggleFeatured : undefined}
                />
              ))}
            </div>

            {/* Server-Side Pagination Bar */}
            {pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 border-t border-slate-800">
                <span className="text-xs text-slate-400">
                  Showing {(page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(page * pagination.limit, pagination.total)} of {pagination.total}{' '}
                  {pluralize(pagination.total, 'project')}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={ChevronLeft}
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                    Page {page} of {pagination.totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    rightIcon={ChevronRight}
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
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
