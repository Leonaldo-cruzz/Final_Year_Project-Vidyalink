import React, { useState } from 'react';
import { ArrowLeft, FolderPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import DashboardLayout from '@/layouts/DashboardLayout';
import ProjectForm from '@/components/projects/ProjectForm';
import { createProject } from '@/services/projectService';
import { getErrorMessage } from '@/utils/formatters';

const CreateProject = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      setError('');
      await createProject(values);
      navigate('/projects', { state: { notice: 'Project created successfully and queued for verification.' } });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to create project'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <button type="button" onClick={() => navigate('/projects')} className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Back to portfolio</button>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-white"><FolderPlus className="h-6 w-6 text-blue-400" /> Add Project</h1>
          <p className="mt-1 text-sm text-slate-400">Capture the context, contribution, and outcomes behind your work.</p>
        </div>
        <ProjectForm onSubmit={handleSubmit} onCancel={() => navigate('/projects')} submitLabel="Create Project" submitting={submitting} serverError={error} />
      </div>
    </DashboardLayout>
  );
};

export default CreateProject;
