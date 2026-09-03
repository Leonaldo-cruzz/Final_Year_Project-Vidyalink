import React from 'react';

const labels = { summary: 'Summary', skills: 'Technical Skills', education: 'Education', experience: 'Experience', projects: 'Projects', certifications: 'Certifications', achievements: 'Achievements', links: 'Links' };

const ResumeSectionSelector = ({ value = [], onChange, disabledSections = [] }) => (
  <div className="grid grid-cols-2 gap-2">
    {Object.entries(labels).map(([key, label]) => {
      const disabled = disabledSections.includes(key);
      return <label key={key} className={`flex items-center gap-2 rounded-lg border p-2 text-xs ${disabled ? 'border-slate-800 text-slate-600' : 'border-slate-700 text-slate-300 cursor-pointer'}`}>
        <input type="checkbox" disabled={disabled} checked={value.includes(key)} onChange={(event) => onChange(event.target.checked ? [...value, key] : value.filter((item) => item !== key))} />
        {label}{disabled && ' (no verified data)'}
      </label>;
    })}
  </div>
);

export default ResumeSectionSelector;
