import React from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const CandidateFilters = ({ value, onChange, onApply, onReset }) => (
  <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 className="text-sm font-bold text-white">Refine candidates</h2>
        <p className="text-xs text-slate-500">All filters are applied to the existing candidate directory.</p>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onReset}>Reset</Button>
        <Button type="button" size="sm" variant="secondary" onClick={onApply}>Apply filters</Button>
      </div>
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Input
        id="filter-skills"
        label="Skills"
        placeholder="Comma-separated skills"
        value={value.skills || ''}
        onChange={(event) => onChange({ skills: event.target.value })}
      />
      <Input
        id="filter-required-skills"
        label="Required verified skills"
        placeholder="Comma-separated skills"
        value={value.requiredSkills || ''}
        onChange={(event) => onChange({ requiredSkills: event.target.value })}
      />
      <Input
        id="filter-branch"
        label="Branch"
        placeholder="Any branch"
        value={value.branch || ''}
        onChange={(event) => onChange({ branch: event.target.value })}
      />
      <Input
        id="filter-college"
        label="College"
        placeholder="Any college"
        value={value.college || ''}
        onChange={(event) => onChange({ college: event.target.value })}
      />
      <Input
        id="filter-domain"
        label="Domain"
        placeholder="Any domain"
        value={value.domain || ''}
        onChange={(event) => onChange({ domain: event.target.value })}
      />
      <Input
        id="filter-graduation-year"
        label="Graduation year"
        type="number"
        min="1900"
        max="2100"
        placeholder="2027"
        value={value.graduationYear || ''}
        onChange={(event) => onChange({ graduationYear: event.target.value })}
      />
      <div>
        <label htmlFor="filter-verification" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-300">Verification</label>
        <select
          id="filter-verification"
          className="form-input"
          value={value.verificationStatus || ''}
          onChange={(event) => onChange({ verificationStatus: event.target.value })}
        >
          <option value="">Any status</option>
          <option value="Verified">Verified portfolio</option>
          <option value="Pending">Pending assets</option>
          <option value="Rejected">Rejected assets</option>
        </select>
      </div>
      <Input
        id="filter-min-score"
        label="Min portfolio score"
        type="number"
        min="0"
        max="100"
        placeholder="0"
        value={value.minPortfolioScore || ''}
        onChange={(event) => onChange({ minPortfolioScore: event.target.value })}
      />
      <Input
        id="filter-max-score"
        label="Max portfolio score"
        type="number"
        min="0"
        max="100"
        placeholder="100"
        value={value.maxPortfolioScore || ''}
        onChange={(event) => onChange({ maxPortfolioScore: event.target.value })}
      />
      <Input
        id="filter-min-readiness"
        label="Min industry readiness"
        type="number"
        min="0"
        max="100"
        placeholder="0"
        value={value.minIndustryReadiness || ''}
        onChange={(event) => onChange({ minIndustryReadiness: event.target.value })}
      />
      <Input
        id="filter-max-readiness"
        label="Max industry readiness"
        type="number"
        min="0"
        max="100"
        placeholder="100"
        value={value.maxIndustryReadiness || ''}
        onChange={(event) => onChange({ maxIndustryReadiness: event.target.value })}
      />
      <Input
        id="filter-min-ats"
        label="Min ATS score"
        type="number"
        min="0"
        max="100"
        placeholder="0"
        value={value.minATSScore || ''}
        onChange={(event) => onChange({ minATSScore: event.target.value })}
      />
      <Input
        id="filter-max-ats"
        label="Max ATS score"
        type="number"
        min="0"
        max="100"
        placeholder="100"
        value={value.maxATSScore || ''}
        onChange={(event) => onChange({ maxATSScore: event.target.value })}
      />
      <label className="flex items-center gap-3 self-end rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-3 text-xs text-slate-300">
        <input
          type="checkbox"
          checked={Boolean(value.verifiedOnly)}
          onChange={(event) => onChange({ verifiedOnly: event.target.checked })}
          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-400 focus:ring-emerald-400"
        />
        Verified public portfolio only
      </label>
    </div>
  </div>
);

export default CandidateFilters;
