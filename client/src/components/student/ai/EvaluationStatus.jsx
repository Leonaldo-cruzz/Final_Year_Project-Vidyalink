import React from 'react';
import { CheckCircle2, Clock3, RefreshCw } from 'lucide-react';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { formatDate } from '@/utils/formatters';
import { getEvaluationDate, getEvaluationVersion, isValidScore } from './helpers';

const hasEvaluation = (result) => Boolean(result && (
  getEvaluationDate(result)
  || isValidScore(result.score)
  || isValidScore(result.portfolioScore)
  || isValidScore(result.atsScore)
  || isValidScore(result.industryReadinessScore)
  || Array.isArray(result.skills)
  || Array.isArray(result.reasons)
));

const EvaluationStatus = ({ result, label = 'Evaluation', onRefresh, refreshing = false }) => {
  const evaluated = hasEvaluation(result);
  const stale = evaluated && result?.isStale === true;
  const statusLabel = stale ? 'Stale' : evaluated ? 'Current' : 'Not evaluated';
  const statusVariant = stale ? 'amber' : evaluated ? 'emerald' : 'slate';
  const StatusIcon = stale ? Clock3 : evaluated ? CheckCircle2 : Clock3;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <Badge variant={statusVariant} size="sm" dot pulse={stale}>
        <StatusIcon className="w-3 h-3" />
        {statusLabel}
      </Badge>
      {evaluated && getEvaluationDate(result) && (
        <span className="text-slate-500">
          {label} {formatDate(getEvaluationDate(result))}
        </span>
      )}
      {evaluated && getEvaluationVersion(result) && (
        <span className="text-slate-600">v{getEvaluationVersion(result)}</span>
      )}
      {stale && (
        <span className="basis-full text-amber-400/90">
          Your source data changed after this evaluation.
        </span>
      )}
      {onRefresh && (
        <Button
          type="button"
          size="xs"
          variant="outline"
          loading={refreshing}
          leftIcon={RefreshCw}
          onClick={onRefresh}
        >
          {evaluated ? 'Refresh' : 'Evaluate'}
        </Button>
      )}
    </div>
  );
};

export default EvaluationStatus;
