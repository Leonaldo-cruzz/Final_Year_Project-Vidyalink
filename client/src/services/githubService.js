import api from './api';

export const connectGithub = async (githubUsername) => {
  const response = await api.post('/github/connect', { githubUsername });
  return response.data;
};

export const getGithubProfile = async () => {
  const response = await api.get('/github/profile');
  return response.data;
};

/**
 * Syncs GitHub profile + repositories → auto-discovers / imports projects.
 *
 * On success, response.data contains:
 *   account:    updated GitHub account snapshot
 *   syncResult: { repositoriesFound, projectsImported, projectsUpdated,
 *                 repositoriesMarkedDeleted, failed }
 */
export const syncGithubProfile = async () => {
  const response = await api.post('/github/sync');
  return response.data;
};

export const getGithubRepositories = async () => {
  const response = await api.get('/github/repositories');
  return response.data;
};

export const disconnectGithub = async () => {
  const response = await api.delete('/github/disconnect');
  return response.data;
};

export default {
  connectGithub,
  getGithubProfile,
  getGithubRepositories,
  syncGithubProfile,
  disconnectGithub,
};
