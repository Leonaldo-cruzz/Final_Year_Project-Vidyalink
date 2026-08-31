export const hasValue = (value) => value !== null && value !== undefined && value !== '';

export const isValidScore = (value) => hasValue(value)
  && Number.isFinite(Number(value))
  && Number(value) >= 0
  && Number(value) <= 100;

export const getEvaluationDate = (result) => result?.evaluatedAt
  || result?.generatedAt
  || result?.calculatedAt
  || null;

export const getEvaluationVersion = (result) => result?.scoringVersion
  || result?.analysisVersion
  || result?.analyticsVersion
  || result?.version
  || null;

export const asList = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

export const textValue = (value) => {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (value && typeof value === 'object') return value.name || value.label || value.title || '';
  return '';
};

export const titleFromKey = (key = '') => key
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/[_-]/g, ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase());

export const normalizeKey = (key = '') => key.replace(/[^a-z0-9]/gi, '').toLowerCase();

export const formatPercent = (value, digits = 0) => isValidScore(value)
  ? `${Number(value).toFixed(digits)}%`
  : 'N/A';

export const joinReasons = (value) => asList(value).map(textValue).filter(Boolean);
