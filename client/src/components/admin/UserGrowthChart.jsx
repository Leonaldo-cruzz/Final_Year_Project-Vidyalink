import React from 'react';
import { SectionCard } from '@/components/ui/Card';
import BarChart from './BarChart';

const UserGrowthChart = ({ data = [] }) => (
  <SectionCard title="User registrations" subtitle="New accounts created over the selected period">
    <BarChart data={data} label="User registrations" />
  </SectionCard>
);

export default UserGrowthChart;
