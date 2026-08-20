import React from 'react';
import { SectionCard } from '@/components/ui/Card';
import BarChart from './BarChart';

const ActivityChart = ({ activity }) => {
  const series = activity?.series || {};
  return (
    <SectionCard title="Platform activity" subtitle="Events tracked from persisted platform records">
      <div className="grid gap-6 xl:grid-cols-2">
        <div><p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Alumni registrations</p><BarChart data={series.alumniRegistrations || []} label="Alumni registrations" /></div>
        <div><p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Portfolio updates</p><BarChart data={series.portfolioUpdates || []} label="Portfolio updates" /></div>
        <div><p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Verification submissions</p><BarChart data={series.verificationSubmissions || []} label="Verification submissions" /></div>
        <div><p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Recruiter shortlists</p><BarChart data={series.recruiterShortlists || []} label="Recruiter shortlists" /></div>
        <div><p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Interviews</p><BarChart data={series.interviews || []} label="Interviews" /></div>
      </div>
    </SectionCard>
  );
};

export default ActivityChart;
