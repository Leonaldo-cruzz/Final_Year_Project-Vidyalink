import React from 'react';
import { SectionCard } from '@/components/ui/Card';
import BarChart from './BarChart';

const RecruitmentAnalyticsChart = ({ analytics }) => {
  const data = [
    { label: 'Shortlists', count: analytics?.totalShortlists || 0 },
    { label: 'Interviews', count: analytics?.totalInterviews || 0 },
    { label: 'Scheduled', count: analytics?.scheduledInterviews || 0 },
    { label: 'Activity', count: analytics?.recruiterActivities || 0 },
  ];
  return <SectionCard title="Recruitment" subtitle="Current application states and scheduled interview records"><BarChart data={data} label="Recruitment analytics" /></SectionCard>;
};

export default RecruitmentAnalyticsChart;
