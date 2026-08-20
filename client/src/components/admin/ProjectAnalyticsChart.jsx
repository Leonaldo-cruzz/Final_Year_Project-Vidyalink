import React from 'react';
import { SectionCard } from '@/components/ui/Card';
import BarChart from './BarChart';

const ProjectAnalyticsChart = ({ analytics }) => (
  <SectionCard title="Project portfolio" subtitle={`Completed ${analytics?.completedProjects || 0} · In progress ${analytics?.inProgressProjects || 0}`}>
    <div className="grid gap-6 xl:grid-cols-2">
      <div><p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Projects by category</p><BarChart data={analytics?.byCategory || []} label="Projects by category" /></div>
      <div><p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">New projects</p><BarChart data={analytics?.projectsOverTime || []} label="Projects over time" /></div>
    </div>
  </SectionCard>
);

export default ProjectAnalyticsChart;
