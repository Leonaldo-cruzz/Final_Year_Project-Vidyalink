import request from 'supertest';
import User from '../../src/models/user.model.js';
import { getApp, apiPath } from './api.js';

let sequence = 0;

export const userInput = (overrides = {}) => {
  sequence += 1;
  return {
    fullName: `Test User ${sequence}`,
    email: `test-user-${sequence}@example.test`,
    password: 'Strong#Pass123',
    role: 'student',
    ...overrides,
  };
};

export const registerUser = async (overrides = {}) => {
  const app = await getApp();
  const payload = userInput(overrides);
  const response = await request(app).post(apiPath('/auth/register')).send(payload);
  return { payload, response };
};

export const loginUser = async (overrides = {}) => {
  const app = await getApp();
  const { payload, response: registration } = await registerUser(overrides);
  if (registration.status !== 201) throw new Error(`Test user registration failed: ${registration.body.message}`);

  const agent = request.agent(app);
  const response = await agent.post(apiPath('/auth/login')).send({
    email: payload.email,
    password: payload.password,
  });

  return {
    agent,
    token: response.body.data.accessToken,
    login: response,
    user: response.body.data.user,
    payload,
  };
};

export const createUser = async (overrides = {}) => User.create(userInput(overrides));

export const loginExistingUser = async (email, password = 'Strong#Pass123') => {
  const app = await getApp();
  return request(app).post(apiPath('/auth/login')).send({ email, password });
};
