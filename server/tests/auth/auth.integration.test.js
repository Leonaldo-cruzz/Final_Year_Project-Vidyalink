import { describe, expect, it } from 'vitest';
import request from 'supertest';

import { apiPath, getApp } from '../helpers/api.js';
import {
  createUser,
  loginExistingUser,
  loginUser,
  registerUser,
  userInput,
} from '../helpers/auth.js';

describe('Authentication API', () => {
  it('registers a user using the ApiResponse envelope without sensitive fields', async () => {
    const { response } = await registerUser();

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ success: true, statusCode: 201, message: 'Registration successful' });
    expect(response.body.data.user).toMatchObject({ role: 'student', status: 'active' });
    expect(response.body.data.user).not.toHaveProperty('password');
    expect(response.body.data.user).not.toHaveProperty('refreshToken');
  });

  it('rejects duplicate registration and invalid registration input', async () => {
    const first = userInput();
    const app = await getApp();
    await request(app).post(apiPath('/auth/register')).send(first).expect(201);

    const duplicate = await request(app).post(apiPath('/auth/register')).send(first);
    const invalidEmail = await request(app).post(apiPath('/auth/register')).send({ ...first, email: 'not-an-email' });
    const weakPassword = await request(app).post(apiPath('/auth/register')).send({
      ...first,
      email: 'weak-password@example.test',
      password: 'weak',
    });
    const adminSpoof = await request(app).post(apiPath('/auth/register')).send({
      ...first,
      email: 'admin-spoof@example.test',
      role: 'admin',
    });

    for (const response of [duplicate, invalidEmail, weakPassword, adminSpoof]) {
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeInstanceOf(Array);
    }
    expect(duplicate.status).toBe(409);
    expect(invalidEmail.status).toBe(400);
    expect(weakPassword.status).toBe(400);
    expect(adminSpoof.status).toBe(400);
  });

  it('logs in with an access token and an HTTP-only refresh cookie only', async () => {
    const { login, payload } = await loginUser();

    expect(login.status).toBe(200);
    expect(login.body.data.accessToken).toEqual(expect.any(String));
    expect(login.body.data).not.toHaveProperty('refreshToken');
    expect(login.body.data.user).not.toHaveProperty('password');
    expect(JSON.stringify(login.body)).not.toContain(payload.password);
    const refreshCookie = login.headers['set-cookie']?.find((cookie) => cookie.startsWith('refreshToken='));
    expect(refreshCookie).toContain('HttpOnly');
  });

  it('rejects invalid passwords and unknown users with the same 401 response', async () => {
    const { payload } = await registerUser();
    const invalidPassword = await loginExistingUser(payload.email, 'Wrong#Pass123');
    const unknownUser = await loginExistingUser('unknown@example.test');

    for (const response of [invalidPassword, unknownUser]) {
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({ success: false, statusCode: 401, message: 'Invalid email or password' });
    }
  });

  it('rotates a refresh cookie and revokes it on logout', async () => {
    const { agent, token } = await loginUser();
    const refreshed = await agent.post(apiPath('/auth/refresh-token')).send({});

    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toEqual(expect.any(String));
    expect(refreshed.body.data).not.toHaveProperty('refreshToken');

    const logout = await agent.post(apiPath('/auth/logout')).set('Authorization', `Bearer ${token}`);
    expect(logout.status).toBe(200);
    expect(logout.headers['set-cookie']?.find((cookie) => cookie.startsWith('refreshToken='))).toContain('HttpOnly');

    const revoked = await agent.post(apiPath('/auth/refresh-token')).send({});
    expect(revoked.status).toBe(401);
  });

  it('rejects a protected route without a token and with an invalid token', async () => {
    const app = await getApp();
    const noToken = await request(app).get(apiPath('/auth/me'));
    const invalidToken = await request(app).get(apiPath('/auth/me')).set('Authorization', 'Bearer invalid.token.value');

    expect(noToken.status).toBe(401);
    expect(invalidToken.status).toBe(401);
    expect(noToken.body.success).toBe(false);
    expect(invalidToken.body.success).toBe(false);
  });

  it('enforces student-only resume access for every persisted role', async () => {
    const student = await loginUser({ role: 'student' });
    const studentResponse = await student.agent.get(apiPath('/resume')).set('Authorization', `Bearer ${student.token}`);
    expect(studentResponse.status).toBe(200);

    for (const role of ['faculty', 'recruiter', 'alumni']) {
      const session = await loginUser({ role });
      const response = await session.agent.get(apiPath('/resume')).set('Authorization', `Bearer ${session.token}`);
      expect(response.status).toBe(403);
    }

    const admin = await createUser({ role: 'admin' });
    const adminLogin = await loginExistingUser(admin.email);
    const adminResponse = await (await getApp())
      ? await request(await getApp()).get(apiPath('/resume')).set('Authorization', `Bearer ${adminLogin.body.data.accessToken}`)
      : null;
    expect(adminResponse.status).toBe(403);
  });
});
