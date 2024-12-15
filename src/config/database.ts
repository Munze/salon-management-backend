import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Prevent multiple instances of Prisma Client in development
declare global {
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

  // Test the connection
  client.$connect()
    .then(() => {
      logger.info('Successfully connected to the database');
    })
    .catch((error) => {
      logger.error('Failed to connect to the database:', error);
      process.exit(1);
    });

  return client;
};

export const prisma = global.prisma || prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Handle cleanup
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
