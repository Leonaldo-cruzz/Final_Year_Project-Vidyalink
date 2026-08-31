import React from 'react';
import Card from '@/components/ui/Card';

const labelFor = (key) => key
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/[_-]/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const numericScore = (value) => {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && typeof value.score === 'number') return value.score;
  return null;
};

const ScoreBreakdown = ({ breakdown = {}, title = 'Component breakdown' }) => {
  const entries = Object.entries(breakdown || {}).filter(([, value]) => numericScore(value) !== null);

  if (entries.length === 0) return null;

  return (
    <Card className="p-5">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <div className="mt-4 space-y-4">
        {entries.map(([key, value]) => {
          const score = Math.max(0, Math.min(100, numericScore(value)));
          const weight = value && typeof value === 'object' ? value.weight : null;
          return (
            <div key={key}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-slate-300">{labelFor(key)}</span>
                <span className="text-slate-500">{score.toFixed(2)}{weight !== null ? ` · ${weight}% weight` : ''}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-purple-400" style={{ width: `${score}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default ScoreBreakdown;
