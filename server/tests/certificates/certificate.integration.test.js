import { describe, expect, it } from 'vitest';

import { apiPath } from '../helpers/api.js';
import { loginUser } from '../helpers/auth.js';

const certificateFields = {
  title: 'Cloud Fundamentals',
  issuer: 'Example Cloud',
  category: 'Course',
  issueDate: '2026-01-15',
  skills: 'Cloud, Security',
};

const attachCertificate = (requestBuilder, fields = certificateFields) => {
  for (const [key, value] of Object.entries(fields)) requestBuilder.field(key, value);
  return requestBuilder.attach('certificateFile', Buffer.from('%PDF-1.4\nCertificate'), {
    filename: 'certificate.pdf',
    contentType: 'application/pdf',
  });
};

describe('Certificate API', () => {
  it('creates, reads, updates, and deletes an owned certificate', async () => {
    const session = await loginUser();
    const authorization = { Authorization: `Bearer ${session.token}` };
    const created = await attachCertificate(session.agent.post(apiPath('/certificates')).set(authorization));
    const id = created.body.data._id;
    const listed = await session.agent.get(apiPath('/certificates')).set(authorization);
    const fetched = await session.agent.get(apiPath(`/certificates/${id}`)).set(authorization);
    const updated = await session.agent.put(apiPath(`/certificates/${id}`)).set(authorization).field('title', 'Updated Cloud Fundamentals');
    const deleted = await session.agent.delete(apiPath(`/certificates/${id}`)).set(authorization);

    expect(created.status).toBe(201);
    expect(created.body.data.verificationStatus).toBe('Pending');
    expect(created.body.data.skills).toEqual(['Cloud', 'Security']);
    expect(listed.body.data).toHaveLength(1);
    expect(fetched.body.data.title).toBe(certificateFields.title);
    expect(updated.body.data.title).toBe('Updated Cloud Fundamentals');
    expect(deleted.status).toBe(200);
  });

  it('validates create data, IDs, allow-listed filters, and certificate ownership', async () => {
    const first = await loginUser();
    const authorization = { Authorization: `Bearer ${first.token}` };
    const invalid = await first.agent.post(apiPath('/certificates')).set(authorization).field('title', 'Incomplete');
    const created = await attachCertificate(first.agent.post(apiPath('/certificates')).set(authorization));
    const second = await loginUser();
    const secondAuthorization = { Authorization: `Bearer ${second.token}` };
    const otherUser = await second.agent.get(apiPath(`/certificates/${created.body.data._id}`)).set(secondAuthorization);
    const invalidId = await first.agent.get(apiPath('/certificates/not-an-id')).set(authorization);
    const operatorInjection = await first.agent.get(apiPath('/certificates')).set(authorization).query({ 'status[$ne]': 'Pending' });

    expect(invalid.status).toBe(400);
    expect(otherUser.status).toBe(404);
    expect(invalidId.status).toBe(400);
    expect(operatorInjection.status).toBe(400);
  });
});
