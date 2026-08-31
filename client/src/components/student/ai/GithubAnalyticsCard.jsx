import React from 'react';
import { Code2, GitCommitHorizontal, LibraryBig } from 'lucide-react';

import { SectionCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EvaluationStatus from './EvaluationStatus';
import { asList, formatPercent, getEvaluationDate, getEvaluationVersion } from './helpers';
import { formatDate } from '@/utils/formatters';

const Metric = ({ label, value }) => (
  <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-3">
    <p className="text-xs text-slate-500">{label}</p>
    <p className="mt-1 text-lg font-bold text-slate-200">{value ?? 'N/A'}</p>
  </div>
);

const GithubAnalyticsCard = ({ result }) => (
  <SectionCard
    title="GitHub Analytics"
    subtitle="Persisted repository and activity evidence"
    action={<Code2 className="h-4 w-4 text-blue-400" />}
  >
    {!result ? (
      <p className="text-sm text-slate-500">GitHub analytics are not available yet. Connect GitHub to generate evidence.</p>
    ) : (
      <div>
        <EvaluationStatus result={result} />
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Repositories" value={result.repositoryCount} />
          <Metric label="Active repositories" value={result.activeRepositoryCount} />
          <Metric label="Total commits" value={result.commitCount} />
          <Metric label="Recent commits" value={result.recentCommitCount} />
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <LibraryBig className="h-4 w-4 text-blue-400" /> Languages
            </h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {asList(result.languages).length > 0
                ? asList(result.languages).map((language) => <Badge key={language} variant="blue" size="sm">{language}</Badge>)
                : <span className="text-xs text-slate-600">None recorded.</span>}
            </div>
          </div>
          <div>
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <GitCommitHorizontal className="h-4 w-4 text-emerald-400" /> Activity
            </h4>
            <div className="mt-2 space-y-1.5 text-sm text-slate-400">
              <p>Recent activity: <span className="text-slate-200">{result.recentActivityDate ? formatDate(result.recentActivityDate) : 'N/A'}</span></p>
              <p>Average commit frequency: <span className="text-slate-200">{result.averageCommitFrequency ?? 'N/A'}</span></p>
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Metric label="README coverage" value={formatPercent(result.readmeCoverage)} />
          <Metric label="Documentation coverage" value={formatPercent(result.documentationCoverage)} />
        </div>
        {getEvaluationDate(result) || getEvaluationVersion(result) ? (
          <p className="mt-4 text-xs text-slate-600">
            {getEvaluationDate(result) ? `Calculated ${formatDate(getEvaluationDate(result))}` : ''}
            {getEvaluationVersion(result) ? ` · Version ${getEvaluationVersion(result)}` : ''}
          </p>
        ) : null}
      </div>
    )}
  </SectionCard>
);

export default GithubAnalyticsCard;
