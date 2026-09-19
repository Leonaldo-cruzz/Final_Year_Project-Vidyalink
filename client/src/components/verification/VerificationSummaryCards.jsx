import React from 'react';
import { CheckCircle2, Clock3, MessageSquareWarning, XCircle } from 'lucide-react';
import { StatCard } from '@/components/ui/Card';

const VerificationSummaryCards = ({ summary = {} }) => {
  const cards = [
    {
      label: 'Pending Verifications',
      value: summary.pendingRequests ?? 0,
      icon: Clock3,
      color: 'amber',
    },
    {
      label: 'Verified Today',
      value: summary.verifiedToday ?? 0,
      icon: CheckCircle2,
      color: 'emerald',
    },
    {
      label: 'Rejected Today',
      value: summary.rejectedToday ?? 0,
      icon: XCircle,
      color: 'rose',
    },
    {
      label: 'Changes Requested',
      value: summary.changesRequested ?? summary.changesRequestedToday ?? 0,
      icon: MessageSquareWarning,
      color: 'purple',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
};

export default VerificationSummaryCards;
