import React from 'react';
import { Calendar, Check, XCircle, Ban } from 'lucide-react';

const TIMELINE_STEPS = [
  'Applied',
  'Under Review',
  'Shortlisted',
  'Interview Scheduled',
  'Selected',
];

const ApplicationStatusTimeline = ({ status, interviewDate, interviewMode }) => {
  if (status === 'Rejected') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs font-semibold text-red-400">
        <XCircle className="w-4 h-4 shrink-0" />
        <span>Application Status: Rejected by Recruiter</span>
      </div>
    );
  }

  if (status === 'Withdrawn') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-400 p-3">
        <Ban className="w-4 h-4 shrink-0" />
        <span>Application Withdrawn by Candidate</span>
      </div>
    );
  }

  const currentIndex = TIMELINE_STEPS.indexOf(status);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />

        {TIMELINE_STEPS.map((step, idx) => {
          const isDone = currentIndex >= idx;
          const isCurrent = currentIndex === idx;

          return (
            <div key={step} className="flex flex-col items-center relative z-10">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isCurrent
                    ? 'bg-orange-400 text-slate-950 ring-4 ring-orange-300/15'
                    : isDone
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
              </div>
              <span
                className={`text-[10px] font-semibold mt-1.5 text-center max-w-[70px] leading-tight ${
                  isCurrent
                    ? 'text-orange-300 font-bold'
                    : isDone
                    ? 'text-emerald-400'
                    : 'text-slate-500'
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>

      {status === 'Interview Scheduled' && interviewDate && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-orange-300/20 bg-orange-300/10 p-3 text-xs text-orange-200">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-300" />
            <span>
              Scheduled: <strong>{new Date(interviewDate).toLocaleString()}</strong>
            </span>
          </div>
          <span className="rounded-md bg-orange-300/10 px-2 py-0.5 font-semibold">
            Mode: {interviewMode || 'Online'}
          </span>
        </div>
      )}
    </div>
  );
};

export default ApplicationStatusTimeline;
