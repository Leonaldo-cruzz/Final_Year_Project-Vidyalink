import { describe, expect, it } from 'vitest';

import { apiPath } from '../helpers/api.js';
import { loginUser } from '../helpers/auth.js';

const pdf = Buffer.from('%PDF-1.4\nTest document');

describe('Resume API', () => {
  it('uploads, reads, replaces, and deletes a student PDF resume', async () => {
    const session = await loginUser();
    const authorization = { Authorization: `Bearer ${session.token}` };
    const uploaded = await session.agent.post(apiPath('/resume')).set(authorization).attach('resume', pdf, { filename: 'resume.pdf', contentType: 'application/pdf' });
    const fetched = await session.agent.get(apiPath('/resume')).set(authorization);
    const replaced = await session.agent.put(apiPath('/resume')).set(authorization).attach('resume', Buffer.from('%PDF-1.4\nReplacement'), { filename: 'replacement.pdf', contentType: 'application/pdf' });
    const deleted = await session.agent.delete(apiPath('/resume')).set(authorization);
    const afterDelete = await session.agent.get(apiPath('/resume')).set(authorization);

    expect(uploaded.status).toBe(201);
    expect(fetched.body.data.originalFileName).toBe('resume.pdf');
    expect(replaced.status).toBe(200);
    expect(replaced.body.data.originalFileName).toBe('replacement.pdf');
    expect(deleted.status).toBe(200);
    expect(afterDelete.body).toMatchObject({ success: true, data: null });
  });

  it('rejects non-PDF and oversized uploads', async () => {
    const session = await loginUser();
    const authorization = { Authorization: `Bearer ${session.token}` };
    const invalidType = await session.agent.post(apiPath('/resume')).set(authorization).attach('resume', Buffer.from('not a PDF'), { filename: 'resume.txt', contentType: 'text/plain' });
    const tooLarge = await session.agent.post(apiPath('/resume')).set(authorization).attach('resume', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'large.pdf', contentType: 'application/pdf' });

    expect(invalidType.status).toBe(400);
    expect(tooLarge.status).toBe(400);
  });

  it('rejects non-students and unauthenticated resume access', async () => {
    const faculty = await loginUser({ role: 'faculty' });
    const forbidden = await faculty.agent.get(apiPath('/resume')).set('Authorization', `Bearer ${faculty.token}`);
    const unauthenticated = await faculty.agent.get(apiPath('/resume'));

    expect(forbidden.status).toBe(403);
    expect(unauthenticated.status).toBe(401);
  });
});
