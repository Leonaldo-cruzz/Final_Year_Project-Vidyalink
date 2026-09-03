import React, { useCallback, useEffect, useState } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import api from '@/services/api';
import { getProjects } from '@/services/projectService';
import { getCertificates } from '@/services/certificateService';
import { deleteGeneratedResume, downloadGeneratedResume, generateResume, getGeneratedResumes, regenerateResume } from '@/services/resumeService';
import { getErrorMessage } from '@/utils/formatters';
import ResumeBuilderForm from '@/components/resume/ResumeBuilderForm';
import ResumePreview from '@/components/resume/ResumePreview';
import ResumeVersionList from '@/components/resume/ResumeVersionList';
import ResumeGenerationStatus from '@/components/resume/ResumeGenerationStatus';
import AtsAnalysisPanel from '@/components/resume/AtsAnalysisPanel';

const ResumeBuilder = () => {
  const [profile, setProfile] = useState(null); const [projects, setProjects] = useState([]); const [certificates, setCertificates] = useState([]);
  const [resumes, setResumes] = useState([]); const [active, setActive] = useState(null); const [loading, setLoading] = useState(true); const [generating, setGenerating] = useState(false); const [busy, setBusy] = useState(null); const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const [profileResponse, projectResponse, certificateResponse, resumeResponse] = await Promise.all([
        api.get('/profile/me').catch(() => ({ data: { data: { profile: null } } })), getProjects(), getCertificates(), getGeneratedResumes(),
      ]);
      setProfile(profileResponse.data?.data?.profile || null);
      setProjects((projectResponse.data || []).filter((item) => item.verificationStatus === 'Verified'));
      setCertificates((certificateResponse.data || []).filter((item) => item.verificationStatus === 'Verified'));
      const items = resumeResponse.data || []; setResumes(items); setActive((current) => current ? items.find((item) => item._id === current._id) || items[0] || null : items[0] || null);
    } catch (err) { setError(getErrorMessage(err, 'Could not load resume builder data')); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const onGenerate = async (values) => { try { setGenerating(true); setError(''); const response = await generateResume(values); setActive(response.data); await load(); } catch (err) { setError(getErrorMessage(err, 'Could not generate resume')); } finally { setGenerating(false); } };
  const onRegenerate = async (id) => { try { setBusy(id); const response = await regenerateResume(id); setActive(response.data); await load(); } catch (err) { setError(getErrorMessage(err, 'Could not regenerate resume')); } finally { setBusy(null); } };
  const onDelete = async (id) => { if (!window.confirm('Delete this generated resume version?')) return; try { await deleteGeneratedResume(id); await load(); } catch (err) { setError(getErrorMessage(err, 'Could not delete resume')); } };
  return <DashboardLayout>
    <div className="flex items-start justify-between gap-4 mb-6"><div><h1 className="text-2xl font-extrabold text-white flex gap-2 items-center"><FileText className="w-6 h-6 text-blue-400" />ATS Resume Builder</h1><p className="text-sm text-slate-400 mt-1">Build a single-column, machine-readable PDF from only your verified profile data.</p></div><Button variant="outline" size="sm" leftIcon={RefreshCw} onClick={load}>Refresh data</Button></div>
    {error && <p className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
    {loading ? <p className="text-slate-400">Loading your verified information…</p> : <div className="grid grid-cols-1 xl:grid-cols-[390px_minmax(0,1fr)] gap-6">
      <SectionCard title="Build your resume" subtitle="Unverified and rejected projects or certificates are never available here."><ResumeBuilderForm profile={profile} projects={projects} certificates={certificates} onGenerate={onGenerate} loading={generating} /></SectionCard>
      <div className="space-y-5"><ResumeGenerationStatus resume={active} /><SectionCard title="ATS-friendly preview" subtitle="This exact single-column structure is used in the PDF."><ResumePreview resume={active} /></SectionCard><SectionCard title="ATS analysis"><AtsAnalysisPanel analysis={active?.atsAnalysis} /></SectionCard><SectionCard title="Versions" subtitle="Regenerating always creates a new version."><ResumeVersionList resumes={resumes} activeId={active?._id} onSelect={setActive} onDownload={downloadGeneratedResume} onRegenerate={onRegenerate} onDelete={onDelete} busy={busy} /></SectionCard></div>
    </div>}
  </DashboardLayout>;
};
export default ResumeBuilder;
