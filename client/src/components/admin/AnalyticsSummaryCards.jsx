import React from 'react';
import { BriefcaseBusiness, FolderKanban, ShieldCheck, UsersRound } from 'lucide-react';
import { StatCard } from '@/components/ui/Card';
import { formatNumber } from '@/utils/formatters';

const AnalyticsSummaryCards = ({ overview, verification, projects, recruitment }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <StatCard label="Platform users" value={formatNumber(overview?.users)} icon={UsersRound} color="blue" />
    <StatCard label="Verified students" value={formatNumber(overview?.verifiedStudents)} icon={ShieldCheck} color="emerald" />
    <StatCard label="Projects" value={formatNumber(projects?.totalProjects ?? overview?.projects)} icon={FolderKanban} color="purple" />
    <StatCard label="Recruitment activity" value={formatNumber(recruitment?.recruiterActivities ?? overview?.recruiterActivities)} icon={BriefcaseBusiness} color="amber" />
    <StatCard label="Pending verification" value={formatNumber(verification?.pending ?? overview?.pendingVerifications)} icon={ShieldCheck} color="amber" />
    <StatCard label="Verified projects" value={formatNumber(projects?.verifiedProjects ?? overview?.verifiedProjects)} icon={FolderKanban} color="emerald" />
    <StatCard label="Interviews recorded" value={formatNumber(recruitment?.totalInterviews ?? overview?.interviews)} icon={BriefcaseBusiness} color="blue" />
    <StatCard label="Referrals" value={overview?.referrals ?? '—'} icon={UsersRound} color="rose" />
  </div>
);

export default AnalyticsSummaryCards;
