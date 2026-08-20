import { describe, expect, it } from 'vitest';

import { apiPath } from '../helpers/api.js';
import { loginUser } from '../helpers/auth.js';

const profileInput = {
  fullName: 'Asha Sharma',
  college: 'Vidya Institute',
  branch: 'Computer Science',
  graduationYear: 2027,
  skills: ['Node.js', 'MongoDB'],
};

describe('Profile API', () => {
  it('creates, reads, and updates only the authenticated user profile', async () => {
    const session = await loginUser();
    const create = await session.agent.post(apiPath('/profile')).set('Authorization', `Bearer ${session.token}`).send(profileInput);
    const read = await session.agent.get(apiPath('/profile/me')).set('Authorization', `Bearer ${session.token}`);
    const update = await session.agent.patch(apiPath('/profile')).set('Authorization', `Bearer ${session.token}`).send({ headline: 'Backend developer' });

    expect(create.status).toBe(201);
    expect(create.body.data.profile.profileCompletion).toBeGreaterThan(0);
    expect(read.status).toBe(200);
    expect(read.body.data.profile.user.email).toBe(session.payload.email);
    expect(update.status).toBe(200);
    expect(update.body.data.profile.headline).toBe('Backend developer');
  });

  it('rejects invalid profile input and preserves ownership boundaries', async () => {
    const first = await loginUser();
    await first.agent.post(apiPath('/profile')).set('Authorization', `Bearer ${first.token}`).send(profileInput).expect(201);

    const invalid = await first.agent.patch(apiPath('/profile')).set('Authorization', `Bearer ${first.token}`).send({ cgpa: 42 });
    const second = await loginUser();
    const otherProfile = await second.agent.get(apiPath('/profile')).set('Authorization', `Bearer ${second.token}`);
    const noToken = await second.agent.get(apiPath('/profile'));

    expect(invalid.status).toBe(400);
    expect(otherProfile.status).toBe(404);
    expect(noToken.status).toBe(401);
  });
});
