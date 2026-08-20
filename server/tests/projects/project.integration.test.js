import { describe, expect, it } from 'vitest';

import { apiPath } from '../helpers/api.js';
import { loginUser } from '../helpers/auth.js';

const projectInput = {
  title: 'Portfolio Platform',
  shortDescription: 'A secure platform for verified student work.',
  detailedDescription: 'A secure platform that lets students publish project portfolios for authorised reviewers.',
  category: 'Web Development',
  technologies: ['Node.js', 'MongoDB'],
  projectStatus: 'In Progress',
};

describe('Project API', () => {
  it('creates, lists, reads, updates, and deletes an owned project', async () => {
    const session = await loginUser();
    const authorization = { Authorization: `Bearer ${session.token}` };
    const created = await session.agent.post(apiPath('/projects')).set(authorization).send(projectInput);
    const id = created.body.data._id;
    const listed = await session.agent.get(apiPath('/projects')).set(authorization);
    const fetched = await session.agent.get(apiPath(`/projects/${id}`)).set(authorization);
    const updated = await session.agent.put(apiPath(`/projects/${id}`)).set(authorization).send({ title: 'Verified Portfolio Platform' });
    const deleted = await session.agent.delete(apiPath(`/projects/${id}`)).set(authorization);

    expect(created.status).toBe(201);
    expect(created.body.data.verificationStatus).toBe('Pending');
    expect(listed.body.data).toHaveLength(1);
    expect(fetched.body.data.title).toBe(projectInput.title);
    expect(updated.body.data.title).toBe('Verified Portfolio Platform');
    expect(deleted.status).toBe(200);
  });

  it('enforces validation, ownership, protected access, and safe query fields', async () => {
    const first = await loginUser();
    const authorization = { Authorization: `Bearer ${first.token}` };
    const invalid = await first.agent.post(apiPath('/projects')).set(authorization).send({ title: 'x' });
    const created = await first.agent.post(apiPath('/projects')).set(authorization).send(projectInput);
    const second = await loginUser();
    const secondAuthorization = { Authorization: `Bearer ${second.token}` };
    const otherUser = await second.agent.get(apiPath(`/projects/${created.body.data._id}`)).set(secondAuthorization);
    const invalidId = await first.agent.get(apiPath('/projects/not-an-id')).set(authorization);
    const operatorInjection = await first.agent.get(apiPath('/projects')).set(authorization).query({ 'sort[$ne]': 'Oldest' });
    const publicAttempt = await second.agent.get(apiPath(`/projects/${created.body.data._id}`));

    expect(invalid.status).toBe(400);
    expect(otherUser.status).toBe(404);
    expect(invalidId.status).toBe(400);
    expect(operatorInjection.status).toBe(400);
    expect(publicAttempt.status).toBe(401);
  });
});
