import React, { useState, useCallback, useEffect } from 'react';
import {
  Code2 as Github,
  ExternalLink,
  GitFork,
  Link2,
  RefreshCw,
  ShieldCheck,
  Star,
  Unplug,
  ArrowRight,
  GitBranch,
  Lock,
  Archive,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import DashboardLayout from '@/layouts/DashboardLayout';
import Button from '@/components/ui/Button';
import Card, { SectionCard } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { FullPageSpinner } from '@/components/ui/Spinner';
import GithubConnectModal from '@/components/github/GithubConnectModal';
import GithubProfileCard from '@/components/github/GithubProfileCard';
import { useAuth } from '@/context/AuthContext';
import {
  disconnectGithub,
  getGithubProfile,
  getGithubRepositories,
  syncGithubProfile,
} from '@/services/githubService';
import { getErrorMessage } from '@/utils/formatters';
import { ROUTES } from '@/constants';

/** Small non-intrusive label for GitHub-imported repositories */
const GithubSourceBadge = ({ isFork, isArchived, isPrivate }) => (
  <div className="flex flex-wrap gap-1">
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 border border-orange-300/30 text-orange-300">
      <Github className="w-2.5 h-2.5" /> GitHub
    </span>
    {isFork && (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
        <GitBranch className="w-2.5 h-2.5" /> Fork
      </span>
    )}
    {isArchived && (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
        <Archive className="w-2.5 h-2.5" /> Archived
      </span>
    )}
    {isPrivate && (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
        <Lock className="w-2.5 h-2.5" /> Private
      </span>
    )}
  </div>
);

/** Displays the structured result after a sync completes */
const SyncResultBanner = ({ result, onViewProjects }) => {
  if (!result) return null;
  const hasImports = result.projectsImported > 0;
  const hasUpdates = result.projectsUpdated > 0;
  const nothing = !hasImports && !hasUpdates;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-xl border px-4 py-4 text-sm space-y-3 ${
        hasImports
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          : 'border-slate-700 bg-slate-900/60 text-slate-300'
      }`}
    >
      <div className="flex items-center gap-2 font-bold text-base">
        <RefreshCw className="w-4 h-4 shrink-0" />
        GitHub Sync Complete
      </div>
      <ul className="space-y-1 text-sm">
        <li>
          <span className="font-semibold text-white">{result.repositoriesFound}</span>
          {' '}repositories found on GitHub
        </li>
        <li>
          <span className={`font-semibold ${hasImports ? 'text-emerald-300' : 'text-slate-400'}`}>
            {result.projectsImported}
          </span>
          {' '}new {result.projectsImported === 1 ? 'project' : 'projects'} imported
        </li>
        <li>
          <span className={`font-semibold ${hasUpdates ? 'text-orange-300' : 'text-slate-400'}`}>
            {result.projectsUpdated}
          </span>
          {' '}existing {result.projectsUpdated === 1 ? 'project' : 'projects'} updated
        </li>
        {result.repositoriesMarkedDeleted > 0 && (
          <li className="text-slate-500 text-xs">
            {result.repositoriesMarkedDeleted} previously-synced{' '}
            {result.repositoriesMarkedDeleted === 1 ? 'repository' : 'repositories'} no longer
            found on GitHub — portfolio records preserved.
          </li>
        )}
      </ul>
      {nothing && (
        <p className="text-xs text-slate-400">
          All repositories are already up-to-date. No changes were needed.
        </p>
      )}
      {(hasImports || hasUpdates) && (
        <Button
          size="sm"
          variant="primary"
          rightIcon={ArrowRight}
          onClick={onViewProjects}
          id="github-sync-view-projects"
        >
          View in Projects
        </Button>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const GithubIntegration = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [repos, setRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [syncResult, setSyncResult] = useState(null);

  const loadRepos = useCallback(async () => {
    try {
      setLoadingRepos(true);
      const res = await getGithubRepositories();
      setRepos(Array.isArray(res.data) ? res.data : []);
    } catch {
      setRepos([]);
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getGithubProfile();
      setProfile(response.data);
      if (response.data?.connectionStatus === 'Connected') {
        loadRepos();
      }
    } catch (requestError) {
      if (requestError?.response?.status === 404) {
        setProfile(null);
        setRepos([]);
      } else {
        setError(getErrorMessage(requestError, 'Unable to load GitHub profile'));
      }
    } finally {
      setLoading(false);
    }
  }, [loadRepos]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  /**
   * Sync handler — calls the backend which now:
   * 1. Refreshes GitHub profile
   * 2. Fetches ALL repositories (paginated)
   * 3. Matches existing VidyaLink projects → updates
   * 4. Imports unmatched repositories → new unverified projects
   * 5. Returns a structured sync result
   */
  const handleSync = async () => {
    try {
      setSyncing(true);
      setError('');
      setSyncResult(null);
      const response = await syncGithubProfile();

      // Backend now returns { account, syncResult }
      const account = response.data?.account ?? response.data;
      const result = response.data?.syncResult ?? null;

      setProfile(account);
      setSyncResult(result);

      // Refresh the repository list display to reflect the latest sync
      await loadRepos();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to sync GitHub profile'));
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      setError('');
      const response = await disconnectGithub();
      setProfile(response.data);
      setDisconnectOpen(false);
      setSyncResult(null);
      setNotice('GitHub account disconnected. Your existing projects are preserved.');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to disconnect GitHub account'));
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) return <FullPageSpinner message="Loading GitHub integration…" />;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="page-title text-white">GitHub Integration</h1>
              <Github className="h-6 w-6 text-slate-300" />
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Connect your GitHub profile. Repositories are automatically discovered and imported
              as unverified projects in your portfolio.
            </p>
          </div>
          {profile && profile.connectionStatus === 'Disconnected' && (
            <Button leftIcon={Link2} onClick={() => setConnectOpen(true)}>Connect GitHub</Button>
          )}
        </div>

        {user?.fullName && (
          <p className="text-xs text-slate-500">Profile owner: {user.fullName}</p>
        )}

        {/* Notices & Errors */}
        {notice && (
          <div role="status" aria-live="polite" className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {notice}
          </div>
        )}
        {error && (
          <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Sync Result Banner */}
        {syncResult && (
          <SyncResultBanner
            result={syncResult}
            onViewProjects={() => navigate(ROUTES.PROJECTS)}
          />
        )}

        {profile ? (
          <>
            <GithubProfileCard
              profile={profile}
              onSync={handleSync}
              onDisconnect={() => setDisconnectOpen(true)}
              syncing={syncing}
              disconnecting={disconnecting}
            />

            {profile.connectionStatus === 'Connected' && (
              <SectionCard
                title={`Repositories (${repos.length})`}
                subtitle="Live from GitHub — repositories are automatically imported as projects on sync"
                action={
                  <Button
                    size="xs"
                    variant="secondary"
                    leftIcon={RefreshCw}
                    loading={syncing}
                    onClick={handleSync}
                    id="github-sync-button"
                  >
                    {syncing ? 'Syncing…' : 'Sync Now'}
                  </Button>
                }
              >
                {/* Sync explanation note */}
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Clicking <strong className="text-slate-300">Sync Now</strong> fetches all your
                  repositories, updates linked projects, and automatically imports new repositories
                  as <em>unverified</em> portfolio projects ready for faculty review.
                </p>

                {loadingRepos ? (
                  <p className="py-8 text-center text-xs text-slate-400">Loading repositories…</p>
                ) : repos.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">
                    No public repositories found for this account.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {repos.map((repo) => (
                      <div
                        key={repo.id || repo.name}
                        className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/60 flex flex-col justify-between space-y-2"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <h3 className="text-sm font-bold text-white truncate">{repo.name}</h3>
                            <a
                              href={repo.htmlUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-white shrink-0"
                              aria-label={`Open ${repo.name} on GitHub`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                          <GithubSourceBadge
                            isFork={repo.isFork}
                            isArchived={repo.isArchived}
                            isPrivate={repo.isPrivate}
                          />
                          {repo.description && (
                            <p className="text-xs text-slate-400 line-clamp-2 mt-1.5">{repo.description}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                          {repo.language && (
                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-orange-200">
                              {repo.language}
                            </span>
                          )}
                          {repo.topics?.slice(0, 3).map((topic) => (
                            <span
                              key={topic}
                              className="px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-700/60 text-slate-500 font-mono text-[10px]"
                            >
                              {topic}
                            </span>
                          ))}
                          <span className="flex items-center gap-1 ml-auto">
                            <Star className="w-3 h-3 text-amber-400" /> {repo.stars}
                          </span>
                          <span className="flex items-center gap-1">
                            <GitFork className="w-3 h-3 text-slate-400" /> {repo.forks}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {repos.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between gap-4">
                    <p className="text-xs text-slate-500">
                      Imported projects remain <strong className="text-amber-400">Unverified</strong> until
                      reviewed and approved by faculty.
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      rightIcon={ArrowRight}
                      onClick={() => navigate(ROUTES.PROJECTS)}
                      id="github-view-projects-link"
                    >
                      View Projects
                    </Button>
                  </div>
                )}
              </SectionCard>
            )}
          </>
        ) : (
          /* Not connected yet */
          <Card className="relative overflow-hidden p-6 sm:p-10">
            <div className="absolute right-0 top-0 h-24 w-24 border-l border-b border-orange-300/20" aria-hidden="true" />
            <div className="relative max-w-2xl">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800/80">
                <Github className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Showcase your GitHub presence</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Connect your GitHub username. Your repositories are automatically discovered and
                imported as portfolio projects on every sync — no manual re-entry needed.
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" /> Public profile only
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <RefreshCw className="h-4 w-4 text-orange-300" /> Auto project discovery on sync
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Github className="h-4 w-4 text-slate-300" /> Repositories → unverified projects
                </span>
              </div>
              <Button className="mt-7" leftIcon={Link2} onClick={() => setConnectOpen(true)} id="github-connect-button">
                Connect GitHub
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Connect Modal */}
      <GithubConnectModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onSuccess={(account) => {
          setProfile(account);
          setNotice('GitHub account connected. Click "Sync Now" to discover your repositories.');
        }}
      />

      {/* Disconnect Confirmation Modal */}
      <Modal
        open={disconnectOpen}
        onClose={() => setDisconnectOpen(false)}
        title="Disconnect GitHub"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDisconnectOpen(false)} disabled={disconnecting}>Cancel</Button>
            <Button variant="danger" leftIcon={Unplug} loading={disconnecting} onClick={handleDisconnect}>Disconnect</Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-300">
          Disconnect your GitHub profile? Your saved snapshot and all imported portfolio projects
          will be preserved. The connection will no longer be marked as active or syncable.
        </p>
      </Modal>
    </DashboardLayout>
  );
};

export default GithubIntegration;
