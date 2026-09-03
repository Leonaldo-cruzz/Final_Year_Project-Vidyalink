import React from 'react';
import { Download, RefreshCw, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';

const ResumeVersionList = ({ resumes = [], activeId, onSelect, onDownload, onRegenerate, onDelete, busy }) => (
  <div className="space-y-2">
    {resumes.length === 0 && <p className="text-sm text-slate-500">No generated versions yet.</p>}
    {resumes.map((resume) => <div key={resume._id} className={`rounded-xl border p-3 ${activeId === resume._id ? 'border-blue-500/50 bg-blue-500/10' : 'border-slate-800 bg-slate-950/30'}`}>
      <button className="w-full text-left" onClick={() => onSelect(resume)}>
        <p className="text-sm font-semibold text-white">Version {resume.version} · {resume.targetRole}</p>
        <p className={`text-xs mt-1 ${resume.status === 'STALE' ? 'text-amber-400' : 'text-emerald-400'}`}>{resume.status}</p>
      </button>
      <div className="flex gap-2 mt-3">
        <Button size="xs" variant="outline" leftIcon={Download} onClick={() => onDownload(resume._id)}>PDF</Button>
        <Button size="xs" variant="ghost" leftIcon={RefreshCw} loading={busy === resume._id} onClick={() => onRegenerate(resume._id)}>Regenerate</Button>
        <Button size="xs" variant="danger" leftIcon={Trash2} onClick={() => onDelete(resume._id)}>Delete</Button>
      </div>
    </div>)}
  </div>
);

export default ResumeVersionList;
