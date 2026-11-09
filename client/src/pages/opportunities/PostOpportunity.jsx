import React, { useEffect, useState } from 'react';
import { ArrowLeft, Briefcase } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import DashboardLayout from '@/layouts/DashboardLayout';
import ProjectForm from '@/components/projects/ProjectForm';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { createProject, getProjectById, updateProject } from '@/services/projectService';
import { getErrorMessage } from '@/utils/formatters';

/**
 * Create (/opportunities/new) or edit (/opportunities/:projectId/edit) an
 * opportunity. Opportunities are stored as projects flagged isOpportunity by
 * the server when a recruiter or faculty member creates them.
 */
const PostOpportunity = () => {
  const { projectId } = useParams();
  const isEdit = Boolean(projectId);
  const navigate = useNavigate();

  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return undefined;
    let active = true;
    (async () => {
      try {
        const response = await getProjectById(projectId);
        if (active) setOpportunity(response.data);
      } catch (requestError) {
        if (active) setError(getErrorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isEdit, projectId]);

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      setError('');
      if (isEdit) {
        await updateProject(projectId, values);
      } else {
        await createProject({ ...values, isOpportunity: true });
      }
      navigate('/opportunities', {
        state: { notice: isEdit ? 'Opportunity updated.' : 'Opportunity posted. Students can now apply.' },
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <FullPageSpinner message="Loading opportunity…" />;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <button
            type="button"
            onClick={() => navigate('/opportunities')}
            className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to opportunities
          </button>
          <h1 className="page-title flex items-center gap-2 text-white">
            <Briefcase className="h-6 w-6 text-orange-300" /> {isEdit ? 'Edit Opportunity' : 'Post Opportunity'}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Describe the role or project and the skills you are looking for. Students apply with their verified portfolio.
          </p>
        </div>

        {isEdit && !opportunity ? (
          <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-400">
            {error || 'Opportunity not found.'}
          </div>
        ) : (
          <ProjectForm
            mode="opportunity"
            initialValues={opportunity || undefined}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/opportunities')}
            submitLabel={isEdit ? 'Save Changes' : 'Post Opportunity'}
            submitting={submitting}
            serverError={error}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default PostOpportunity;
