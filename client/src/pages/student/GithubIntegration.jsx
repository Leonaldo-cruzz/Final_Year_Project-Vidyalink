import { Code2 as Github, ExternalLink, GitFork, Link2, RefreshCw, ShieldCheck, Star, Unplug } from 'lucide-react';

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

const GithubIntegration = () => {
  const { user } = useAuth();
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
    const timer = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError('');
      const response = await syncGithubProfile();
      setProfile(response.data);
      setNotice('GitHub profile synced successfully.');
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
      setNotice('GitHub account disconnected.');
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
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="page-title text-white">GitHub Integration</h1>
              <Github className="h-6 w-6 text-slate-300" />
            </div>
            <p className="mt-1 text-sm text-slate-400">Connect your public GitHub profile to keep your student portfolio current.</p>
          </div>
          {profile && profile.connectionStatus === 'Disconnected' && (
            <Button leftIcon={Link2} onClick={() => setConnectOpen(true)}>Connect GitHub</Button>
          )}
        </div>

        {user?.fullName && <p className="text-xs text-slate-500">Profile owner: {user.fullName}</p>}

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
                title={`Public Repositories (${repos.length})`}
                subtitle="Your public repositories fetched live from GitHub"
              >
                {loadingRepos ? (
                  <p className="py-8 text-center text-xs text-slate-400">Loading repositories…</p>
                ) : repos.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">No public repositories found for this account.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {repos.map((repo) => (
                      <div key={repo.id || repo.name} className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/60 flex flex-col justify-between space-y-2">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-bold text-white truncate">{repo.name}</h3>
                            <a href={repo.htmlUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white shrink-0" aria-label={`Open ${repo.name}`}>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                          {repo.description && <p className="text-xs text-slate-400 line-clamp-2 mt-1">{repo.description}</p>}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                          {repo.language && (
                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-orange-200">
                              {repo.language}
                            </span>
                          )}
                          <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" /> {repo.stars}</span>
                          <span className="flex items-center gap-1"><GitFork className="w-3 h-3 text-slate-400" /> {repo.forks}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            )}
          </>
        ) : (
          <Card className="relative overflow-hidden p-6 sm:p-10">
            <div className="absolute right-0 top-0 h-24 w-24 border-l border-b border-orange-300/20" aria-hidden="true" />
            <div className="relative max-w-2xl">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800/80">
                <Github className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Showcase your GitHub presence</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Connect your username to import your public avatar, bio, follower counts, repository count, and join date. You can manually sync the snapshot whenever you want.
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" /> Public profile only
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <RefreshCw className="h-4 w-4 text-orange-300" /> Manual sync
                </span>
              </div>
              <Button className="mt-7" leftIcon={Link2} onClick={() => setConnectOpen(true)}>Connect GitHub</Button>
            </div>
          </Card>
        )}
      </div>

      <GithubConnectModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onSuccess={(account) => {
          setProfile(account);
          setNotice('GitHub account connected successfully.');
        }}
      />

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
          Disconnect your GitHub profile? Your saved snapshot will remain available, but it will no longer be marked as connected or syncable.
        </p>
      </Modal>
    </DashboardLayout>
  );
};

export default GithubIntegration;
