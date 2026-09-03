import React from 'react';

const AIComparisonRow = ({ label, candidates, getValue }) => (
  <tr className="border-t border-slate-800/80">
    <th scope="row" className="min-w-44 px-4 py-3 text-left text-xs font-semibold text-slate-400">{label}</th>
    {candidates.map((candidate) => (
      <td key={candidate.studentId} className="min-w-52 px-4 py-3 align-top text-sm text-slate-200">
        {getValue(candidate)}
      </td>
    ))}
  </tr>
);

export default AIComparisonRow;

