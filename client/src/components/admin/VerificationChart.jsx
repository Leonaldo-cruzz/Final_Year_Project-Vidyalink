import React from 'react';
import { SectionCard } from '@/components/ui/Card';
import BarChart from './BarChart';

const VerificationChart = ({ analytics }) => {
  const typeData = Object.entries(analytics?.byType || {})
    .filter(([, values]) => values.tracked)
    .map(([label, values]) => ({ label, count: values.pending + values.verified + values.rejected }));

  return (
    <SectionCard title="Verification activity" subtitle={`Pending ${analytics?.pending || 0} · Verified ${analytics?.verified || 0} · Rejected ${analytics?.rejected || 0}`}>
      <div className="grid gap-6 xl:grid-cols-2">
        <div><p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Tracked types</p><BarChart data={typeData} label="Verification types" emptyLabel="No verification-enabled records yet." /></div>
        <div><p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">New submissions</p><BarChart data={analytics?.activityByDate || []} label="Verification submissions" /></div>
      </div>
    </SectionCard>
  );
};

export default VerificationChart;
