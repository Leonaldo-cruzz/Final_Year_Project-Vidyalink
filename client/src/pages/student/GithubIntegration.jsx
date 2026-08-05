import React, { useCallback, useEffect, useState } from 'react';
import { Code2 as Github, Link2, RefreshCw, ShieldCheck, Unplug } from 'lucide-react';

import DashboardLayout from '@/layouts/DashboardLayout';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { FullPageSpinner } from '@/components/ui/Spinner';
import GithubConnectModal from '@/components/github/GithubConnectModal';
import GithubProfileCard from '@/components/github/GithubProfileCard';
import { useAuth } from '@/context/AuthContext';
import {
  disconnectGithub,
  getGithubProfile,
  syncGithubProfile,
} from '@/services/githubService';
import { getErrorMessage } from '@/utils/formatters';

const GithubIntegration = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getGithubProfile();
      setProfile(response.data);
    } catch (requestError) {
      if (requestError?.response?.status === 404) {
        setProfile(null);
      } else {
        setError(getErrorMessage(requestError, 'Unable to load GitHub profile'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

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
            <div className="flex items-center gap-3"><h1 className="text-2xl font-extrabold tracking-tight text-white">GitHub Integration</h1><Github className="h-6 w-6 text-slate-300" /></div>
            <p className="mt-1 text-sm text-slate-400">Connect your public GitHub profile to keep your student portfolio current.</p>
          </div>
          {profile && profile.connectionStatus === 'Disconnected' && <Button leftIcon={Link2} onClick={() => setConnectOpen(true)}>Connect GitHub</Button>}
        </div>

        {user?.fullName && <p className="text-xs text-slate-500">Profile owner: {user.fullName}</p>}
        {notice && <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</div>}
        {error && <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

        {profile ? (
          <GithubProfileCard profile={profile} onSync={handleSync} onDisconnect={() => setDisconnectOpen(true)} syncing={syncing} disconnecting={disconnecting} />
        ) : (
          <Card className="relative overflow-hidden p-6 sm:p-10">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="relative max-w-2xl">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800/80"><Github className="h-7 w-7 text-white" /></div>
              <h2 className="text-xl font-bold text-white">Showcase your GitHub presence</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">Connect your username to import your public avatar, bio, follower counts, repository count, and join date. You can manually sync the snapshot whenever you want.</p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-400"><span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Public profile only</span><span className="inline-flex items-center gap-1.5"><RefreshCw className="h-4 w-4 text-blue-400" /> Manual sync</span></div>
              <Button className="mt-7" leftIcon={Link2} onClick={() => setConnectOpen(true)}>Connect GitHub</Button>
            </div>
          </Card>
        )}
      </div>

      <GithubConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} onSuccess={(account) => { setProfile(account); setNotice('GitHub account connected successfully.'); }} />

      <Modal open={disconnectOpen} onClose={() => setDisconnectOpen(false)} title="Disconnect GitHub" size="sm" footer={<><Button variant="ghost" onClick={() => setDisconnectOpen(false)} disabled={disconnecting}>Cancel</Button><Button variant="danger" leftIcon={Unplug} loading={disconnecting} onClick={handleDisconnect}>Disconnect</Button></>}>
        <p className="text-sm leading-relaxed text-slate-300">Disconnect your GitHub profile? Your saved snapshot will remain available, but it will no longer be marked as connected or syncable.</p>
      </Modal>
    </DashboardLayout>
  );
};

export default GithubIntegration;
