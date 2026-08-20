import React from 'react';

const BarChart = ({ data = [], label = 'Activity', emptyLabel = 'No data recorded for this period.' }) => {
  if (!data.length) {
    return <p className="py-8 text-center text-sm text-slate-500">{emptyLabel}</p>;
  }

  const max = Math.max(...data.map((item) => item.count || 0), 1);

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max items-end gap-2" style={{ minHeight: '176px' }} aria-label={label} role="img">
        {data.map((item) => {
          const height = Math.max(((item.count || 0) / max) * 128, item.count ? 8 : 2);
          return (
            <div key={item.date || item.label} className="flex w-10 flex-col items-center gap-2">
              <span className="text-[10px] font-bold text-slate-300">{item.count}</span>
              <div className="flex h-32 w-full items-end rounded-t-lg bg-slate-800/60 px-1">
                <div className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-cyan-400 transition-all" style={{ height: `${height}px` }} title={`${item.date || item.label}: ${item.count}`} />
              </div>
              <span className="w-full truncate text-center text-[10px] text-slate-500">{item.date || item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BarChart;
