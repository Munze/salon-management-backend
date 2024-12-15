import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const createTestUser = async (overrides = {}) => {
  const defaultPassword = await bcrypt.hash('password123', 10);
  
  return await prisma.user.create({
    data: {
      email: 'test@example.com',
      password: defaultPassword,
      name: 'Test User',
      role: 'STAFF',
      ...overrides,
    },
  });
};

export const createTestClient = async (overrides = {}) => {
  return await prisma.client.create({
    data: {
      name: 'Test Client',
      email: 'client@example.com',
      phone: '+1234567890',
      ...overrides,
    },
  });
};

export const createTestService = async (overrides = {}) => {
  return await prisma.service.create({
    data: {
      name: 'Test Service',
      description: 'Test service description',
      duration: 60,
      price: 50,
      ...overrides,
    },
  });
};

export const createTestAppointment = async (
  clientId: string,
  serviceId: string,
  overrides = {}
) => {
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later

  return await prisma.appointment.create({
    data: {
      clientId,
      serviceId,
      startTime,
      endTime,
      status: 'CONFIRMED',
      ...overrides,
    },
    include: {
      client: true,
      service: true,
    },
  });
};

export const createTestSchedule = async (userId: string, overrides = {}) => {
  return await prisma.schedule.create({
    data: {
      userId,
      dayOfWeek: 1, // Monday
      startTime: '09:00',
      endTime: '17:00',
      ...overrides,
    },
  });
};
