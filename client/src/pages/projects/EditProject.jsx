import React, { useEffect, useState } from 'react';
import { ArrowLeft, FilePenLine } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import DashboardLayout from '@/layouts/DashboardLayout';
import ProjectForm from '@/components/projects/ProjectForm';
import { getProjectById, updateProject } from '@/services/projectService';
import { getErrorMessage } from '@/utils/formatters';
import { FullPageSpinner } from '@/components/ui/Spinner';

const EditProject = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProject = async () => {
      try {
        const response = await getProjectById(projectId);
        setProject(response.data);
      } catch (requestError) {
        setError(getErrorMessage(requestError, 'Unable to load project'));
      } finally {
        setLoading(false);
      }
    };
    loadProject();
  }, [projectId]);

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      setError('');
      await updateProject(projectId, values);
      navigate(`/projects/${projectId}`, { state: { notice: 'Project updated successfully.' } });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to update project'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <FullPageSpinner message="Loading project…" />;
  if (!project) return <DashboardLayout><div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-400">{error || 'Project not found.'}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <button type="button" onClick={() => navigate(`/projects/${projectId}`)} className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Back to project</button>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-white"><FilePenLine className="h-6 w-6 text-blue-400" /> Edit Project</h1>
          <p className="mt-1 text-sm text-slate-400">Keep your project story and links up to date.</p>
        </div>
        <ProjectForm initialValues={project} initialScreenshots={project.screenshots || []} onSubmit={handleSubmit} onCancel={() => navigate(`/projects/${projectId}`)} submitLabel="Save Changes" submitting={submitting} serverError={error} />
      </div>
    </DashboardLayout>
  );
};

export default EditProject;
