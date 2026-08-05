import React from 'react';
import { CalendarDays, Code2 as Github, ExternalLink, GitFork, RefreshCw, Unplug, Users } from 'lucide-react';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { formatDate } from '@/utils/formatters';

const GithubProfileCard = ({ profile, onSync, onDisconnect, syncing = false, disconnecting = false }) => {
  const isConnected = profile.connectionStatus === 'Connected';

  return (
    <Card className="overflow-hidden">
      <div className="h-24 bg-gradient-to-r from-slate-800 via-slate-900 to-blue-950" />
      <div className="px-5 pb-5 sm:px-7 sm:pb-7">
        <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <img src={profile.avatarUrl || '/favicon.svg'} alt={`${profile.githubUsername} avatar`} className="h-24 w-24 rounded-2xl border-4 border-slate-900 bg-slate-800 object-cover" />
            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-2"><Badge variant={isConnected ? 'emerald' : 'slate'} size="sm">{isConnected ? 'Connected' : 'Disconnected'}</Badge></div>
              <h2 className="mt-1 text-xl font-bold text-white">{profile.name || profile.githubUsername}</h2>
              <p className="text-sm text-slate-400">@{profile.githubUsername}</p>
            </div>
          </div>
        </div>

        {profile.bio && <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-300">{profile.bio}</p>}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><Users className="mb-2 h-4 w-4 text-blue-400" /><p className="text-xl font-bold text-white">{profile.followers}</p><p className="text-[11px] text-slate-500">Followers</p></div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><GitFork className="mb-2 h-4 w-4 text-purple-400" /><p className="text-xl font-bold text-white">{profile.following}</p><p className="text-[11px] text-slate-500">Following</p></div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><Github className="mb-2 h-4 w-4 text-emerald-400" /><p className="text-xl font-bold text-white">{profile.publicRepos}</p><p className="text-[11px] text-slate-500">Repositories</p></div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><CalendarDays className="mb-2 h-4 w-4 text-amber-400" /><p className="text-sm font-bold text-white">{formatDate(profile.joinedAt)}</p><p className="text-[11px] text-slate-500">Joined GitHub</p></div>
        </div>

        <div className="mt-5 flex flex-col justify-between gap-3 border-t border-slate-800/70 pt-4 sm:flex-row sm:items-center">
          <p className="text-xs text-slate-500">Last synced {profile.lastSyncedAt ? formatDate(profile.lastSyncedAt, { dateStyle: 'medium', timeStyle: 'short' }) : 'never'}</p>
          <div className="flex flex-wrap gap-2">
            {isConnected && <Button type="button" variant="secondary" size="sm" leftIcon={RefreshCw} loading={syncing} onClick={onSync}>Sync</Button>}
            <a href={profile.githubProfileUrl} target="_blank" rel="noreferrer"><Button type="button" variant="outline" size="sm" leftIcon={ExternalLink}>Open GitHub</Button></a>
            {isConnected && <Button type="button" variant="danger" size="sm" leftIcon={Unplug} loading={disconnecting} onClick={onDisconnect}>Disconnect</Button>}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default GithubProfileCard;
