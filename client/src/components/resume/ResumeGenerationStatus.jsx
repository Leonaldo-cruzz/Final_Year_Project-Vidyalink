import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

const ResumeGenerationStatus = ({ resume }) => {
  if (!resume) return null;
  const stale = resume.status === 'STALE';
  return <div className={`flex gap-2 rounded-xl border p-3 text-xs ${stale ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}`}>
    {stale ? <AlertTriangle className="w-4 h-4 flex-none" /> : <CheckCircle2 className="w-4 h-4 flex-none" />}
    <span>{stale ? 'Your profile or selected portfolio data changed after this version was generated. Regenerate it before sending.' : `Version ${resume.version} uses verified and user-approved profile data only.`}</span>
  </div>;
};

export default ResumeGenerationStatus;
