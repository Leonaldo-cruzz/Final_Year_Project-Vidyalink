import React from 'react';

const AtsAnalysisPanel = ({ analysis }) => {
  if (!analysis || analysis.status === 'unavailable') return <p className="text-sm text-slate-500">ATS analysis is unavailable until the platform ATS service is configured. No replacement scoring algorithm is used.</p>;
  const score = analysis.atsScore ?? analysis.score;
  const matched = analysis.matchedSkills || [];
  const missing = analysis.missingKeywords || [];
  const recommendations = analysis.recommendations || [];
  return <div className="space-y-3 text-sm"><p className="font-semibold text-emerald-300">ATS score: {score ?? 'Not returned'}</p>{matched.length > 0 && <p className="text-slate-300"><span className="text-slate-500">Matched skills:</span> {matched.join(', ')}</p>}{missing.length > 0 && <p className="text-slate-300"><span className="text-slate-500">Missing keywords:</span> {missing.join(', ')}</p>}{recommendations.length > 0 && <ul className="list-disc pl-5 text-slate-300">{recommendations.map((item, index) => <li key={index}>{item}</li>)}</ul>}</div>;
};

export default AtsAnalysisPanel;
