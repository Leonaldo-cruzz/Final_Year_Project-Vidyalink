import request from 'supertest';

let app;

export const getApp = async () => {
  if (!app) {
    const { createApp } = await import('../../src/app.js');
    app = createApp();
  }
  return app;
};

export const getRequest = async () => request(await getApp());

export const apiPath = (path) => `/api/v1${path}`;
