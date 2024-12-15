import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { Express } from 'express';
import request from 'supertest';

const prisma = new PrismaClient();

export const clearDatabase = async () => {
  const tablenames = await prisma.$queryRaw&lt;Array&lt;{ tablename: string }&gt;&gt;`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
  } catch (error) {
    console.log({ error });
  }
};

export const generateAuthToken = (userId: string, role: string = 'STAFF') => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

export const createAuthenticatedRequest = (app: Express, token?: string) => {
  const authenticatedRequest = request(app);
  if (token) {
    authenticatedRequest.set('Authorization', `Bearer ${token}`);
  }
  return authenticatedRequest;
};

export const mockSendGridEmail = jest.fn().mockResolvedValue({
  statusCode: 202,
  body: {},
  headers: {},
});

export const mockDateNow = (date: Date = new Date('2024-03-01T10:00:00Z')) => {
  const originalNow = Date.now;
  beforeAll(() => {
    global.Date.now = jest.fn(() => date.getTime());
  });
  afterAll(() => {
    global.Date.now = originalNow;
  });
};
