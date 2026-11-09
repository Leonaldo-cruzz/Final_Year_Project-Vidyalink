import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Briefcase, ChevronDown, ChevronUp, ExternalLink, FilePenLine, Loader2,
  Lock, PlusSquare, Search, Send, Trash2, Unlock, Users,
} from 'lucide-react';

import DashboardLayout from '@/layouts/DashboardLayout';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ApplyProjectModal from '@/components/applications/ApplyProjectModal';
import { useAuth } from '@/context/AuthContext';
import { ROLES } from '@/constants';
import { deleteProject, getProjects, updateProject } from '@/services/projectService';
import { formatDate, getErrorMessage } from '@/utils/formatters';

const POSTER_ROLES = [ROLES.RECRUITER, ROLES.FACULTY, ROLES.ADMIN];

const APPLICATION_VARIANTS = {
  Applied: 'blue',
  'Under Review': 'amber',
  Shortlisted: 'purple',
  'Interview Scheduled': 'amber',
  Selected: 'emerald',
  Rejected: 'rose',
  Withdrawn: 'slate',
};

const OpportunityCard = ({
  opportunity, isStudent, isOwnPosting, onApply, onEdit, onToggleOpen, onDelete, onViewApplicants, busy,
}) => {
  const [expanded, setExpanded] = useState(false);
  const isClosed = opportunity.projectStatus === 'Archived';
  const poster = opportunity.userId;
  const myApplication = opportunity.myApplication;

  return (
    <Card className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="blue" size="sm">{opportunity.category}</Badge>
            {isClosed ? <Badge variant="slate" size="sm">Closed</Badge> : <Badge variant="emerald" size="sm">Open</Badge>}
            {myApplication && (
              <Badge variant={APPLICATION_VARIANTS[myApplication.status] || 'slate'} size="sm">
                Application: {myApplication.status}
              </Badge>
            )}
          </div>
          <h3 className="mt-2 text-base font-bold text-white">{opportunity.title}</h3>
          {poster && typeof poster === 'object' && (
            <p className="mt-0.5 text-xs text-slate-500">
              Posted by {poster.fullName}{poster.college ? ` · ${poster.college}` : ''}
              {poster.role ? ` (${poster.role})` : ''} · {formatDate(opportunity.createdAt)}
            </p>
          )}
        </div>
        {typeof opportunity.applicantCount === 'number' && (
          <div className="shrink-0 rounded-lg border border-slate-800 px-3 py-1.5 text-center">
            <p className="text-lg font-bold text-white">{opportunity.applicantCount}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Applicants</p>
          </div>
        )}
      </div>

      <p className="text-sm text-slate-300">{opportunity.shortDescription}</p>

      {opportunity.technologies?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {opportunity.technologies.map((tech) => (
            <span key={tech} className="rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-slate-300">
              {tech}
            </span>
          ))}
        </div>
      )}

      {expanded && (
        <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-300">
          <p className="whitespace-pre-line">{opportunity.detailedDescription}</p>
          {opportunity.domain && <p className="text-xs text-slate-500">Domain: {opportunity.domain}</p>}
          {(opportunity.startDate || opportunity.endDate) && (
            <p className="text-xs text-slate-500">
              {opportunity.startDate ? `Starts ${formatDate(opportunity.startDate)}` : ''}
              {opportunity.startDate && opportunity.endDate ? ' · ' : ''}
              {opportunity.endDate ? `Ends ${formatDate(opportunity.endDate)}` : ''}
            </p>
          )}
          {opportunity.documentationUrl && (
            <a href={opportunity.documentationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-orange-300 hover:text-orange-200">
              Reference link <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-4">
        <Button size="sm" variant="ghost" leftIcon={expanded ? ChevronUp : ChevronDown} onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Hide details' : 'Details'}
        </Button>

        {isStudent && !myApplication && (
          <Button size="sm" leftIcon={Send} disabled={isClosed} onClick={() => onApply(opportunity)}>
            {isClosed ? 'Closed' : 'Apply'}
          </Button>
        )}

        {isOwnPosting && (
          <>
            <Button size="sm" variant="secondary" leftIcon={Users} onClick={() => onViewApplicants(opportunity)}>
              Applicants
            </Button>
            <Button size="sm" variant="ghost" leftIcon={FilePenLine} onClick={() => onEdit(opportunity)}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" leftIcon={isClosed ? Unlock : Lock} disabled={busy} onClick={() => onToggleOpen(opportunity)}>
              {isClosed ? 'Reopen' : 'Close'}
            </Button>
            <Button size="sm" variant="ghost" leftIcon={Trash2} disabled={busy} onClick={() => onDelete(opportunity)}>
              Delete
            </Button>
          </>
        )}
      </div>
    </Card>
  );
};

const Opportunities = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isStudent = user?.role === ROLES.STUDENT;
  const canPost = POSTER_ROLES.includes(user?.role);

  const [view, setView] = useState(canPost ? 'mine' : 'open');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [applyTarget, setApplyTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const loadOpportunities = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getProjects({
        type: 'opportunity',
        ...(view === 'mine' ? { mine: true } : {}),
        ...(query ? { search: query } : {}),
        limit: 50,
      });
      const list = response?.data?.projects;
      setOpportunities(Array.isArray(list) ? list : []);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  }, [view, query]);

  useEffect(() => {
    loadOpportunities();
  }, [loadOpportunities]);

  const isOwnPosting = (opportunity) => {
    if (!canPost) return false;
    if (user?.role === ROLES.ADMIN) return true;
    const ownerId = opportunity.userId?._id || opportunity.userId;
    return String(ownerId) === String(user?._id);
  };

  const handleToggleOpen = async (opportunity) => {
    try {
      setBusyId(opportunity._id);
      setError('');
      const nextStatus = opportunity.projectStatus === 'Archived' ? 'In Progress' : 'Archived';
      await updateProject(opportunity._id, { projectStatus: nextStatus });
      setNotice(nextStatus === 'Archived' ? 'Opportunity closed to new applications.' : 'Opportunity reopened.');
      await loadOpportunities();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (opportunity) => {
    if (!window.confirm(`Delete "${opportunity.title}"? This cannot be undone.`)) return;
    try {
      setBusyId(opportunity._id);
      setError('');
      await deleteProject(opportunity._id);
      setNotice('Opportunity deleted.');
      await loadOpportunities();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyId(null);
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setQuery(search.trim());
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="page-title flex items-center gap-2 text-white">
              <Briefcase className="h-6 w-6 text-orange-300" /> Opportunities
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {isStudent
                ? 'Internships and projects posted by recruiters and faculty. Apply with your verified portfolio.'
                : 'Post opportunities and review the students who apply.'}
            </p>
          </div>
          {canPost && (
            <Button leftIcon={PlusSquare} onClick={() => navigate('/opportunities/new')}>
              Post Opportunity
            </Button>
          )}
        </div>

        {notice && (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {notice}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {canPost ? (
            <div className="inline-flex rounded-lg border border-slate-800 p-1">
              {[
                { id: 'mine', label: user?.role === ROLES.ADMIN ? 'All Postings' : 'My Postings' },
                { id: 'open', label: 'Open Opportunities' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setView(tab.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${view === tab.id ? 'bg-orange-300/15 text-orange-200' : 'text-slate-400 hover:text-white'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : <span />}

          <form onSubmit={handleSearch} className="flex w-full gap-2 sm:w-80">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, skills, domain…"
              className="form-input"
              aria-label="Search opportunities"
            />
            <Button type="submit" variant="secondary" leftIcon={Search}>Search</Button>
          </form>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-orange-300" />
            <p className="text-sm text-slate-400">Loading opportunities…</p>
          </div>
        ) : opportunities.length === 0 ? (
          <Card className="py-16 text-center">
            <Briefcase className="mx-auto mb-3 h-10 w-10 text-slate-600" />
            <p className="text-sm text-slate-400">
              {view === 'mine'
                ? 'You have not posted any opportunities yet.'
                : 'No open opportunities right now. Check back soon.'}
            </p>
            {canPost && view === 'mine' && (
              <Button className="mt-4" size="sm" leftIcon={PlusSquare} onClick={() => navigate('/opportunities/new')}>
                Post your first opportunity
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {opportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity._id}
                opportunity={opportunity}
                isStudent={isStudent}
                isOwnPosting={isOwnPosting(opportunity)}
                busy={busyId === opportunity._id}
                onApply={setApplyTarget}
                onEdit={(item) => navigate(`/opportunities/${item._id}/edit`)}
                onViewApplicants={(item) => navigate(`/projects/${item._id}/applicants`)}
                onToggleOpen={handleToggleOpen}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <ApplyProjectModal
        open={Boolean(applyTarget)}
        project={applyTarget}
        onClose={() => setApplyTarget(null)}
        onSuccess={() => {
          setNotice(`Application submitted for "${applyTarget?.title}". Track it under Applications.`);
          loadOpportunities();
        }}
      />
    </DashboardLayout>
  );
};

export default Opportunities;
