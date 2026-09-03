import React from 'react';
import { Search } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const CandidateSearchBar = ({ value, onChange, onSubmit, loading = false }) => (
  <form
    onSubmit={(event) => {
      event.preventDefault();
      onSubmit();
    }}
    className="grid grid-cols-1 gap-3 md:grid-cols-[1.5fr_repeat(4,1fr)_auto]"
  >
    <Input
      id="candidate-search"
      label="Name"
      placeholder="Search candidate name"
      leftIcon={Search}
      value={value.search || ''}
      onChange={(event) => onChange({ search: event.target.value })}
    />
    <Input
      id="candidate-skill-search"
      label="Skill"
      placeholder="React, Python…"
      value={value.skills || ''}
      onChange={(event) => onChange({ skills: event.target.value })}
    />
    <Input
      id="candidate-college-search"
      label="College"
      placeholder="Institution"
      value={value.college || ''}
      onChange={(event) => onChange({ college: event.target.value })}
    />
    <Input
      id="candidate-branch-search"
      label="Branch"
      placeholder="Computer Science"
      value={value.branch || ''}
      onChange={(event) => onChange({ branch: event.target.value })}
    />
    <Input
      id="candidate-domain-search"
      label="Domain"
      placeholder="Web, data, design…"
      value={value.domain || ''}
      onChange={(event) => onChange({ domain: event.target.value })}
    />
    <div className="flex items-end">
      <Button type="submit" loading={loading} leftIcon={Search} fullWidth>
        Search
      </Button>
    </div>
  </form>
);

export default CandidateSearchBar;

