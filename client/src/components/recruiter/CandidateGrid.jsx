import React from 'react';
import CandidateCard from './CandidateCard';
import Spinner from '@/components/ui/Spinner';

const CandidateGrid = ({ candidates, loading, onView, onSummary, onShortlist, onCompare, compareIds = [], shortlistLoadingId }) => {
  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-800/70 bg-slate-900/40">
        <div className="flex items-center gap-3 text-sm text-slate-400"><Spinner /> Loading candidates…</div>
      </div>
    );
  }

  if (!candidates.length) {
    return <div className="rounded-2xl border border-dashed border-slate-700 p-12 text-center text-sm text-slate-400">No candidates match these filters. Try broadening the search.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {candidates.map((candidate) => (
        <CandidateCard
          key={candidate.studentId}
          candidate={candidate}
          onView={() => onView(candidate)}
          onSummary={() => onSummary(candidate)}
          onShortlist={() => onShortlist(candidate)}
          onCompare={onCompare}
          compareSelected={compareIds.includes(candidate.studentId)}
          shortlistLoading={shortlistLoadingId === candidate.studentId}
        />
      ))}
    </div>
  );
};

export default CandidateGrid;
