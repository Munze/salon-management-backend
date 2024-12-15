import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

export const getAllClients = async (req: Request, res: Response) => {
  const requestId = Math.random().toString(36).substring(7);
  logger.info(`[${requestId}] Starting getAllClients request`, {
    headers: req.headers,
    query: req.query
  });

  try {
    logger.debug(`[${requestId}] Attempting database query`);
    
    // First test the database connection
    await prisma.$queryRaw`SELECT 1`
    .then(() => {
      logger.debug(`[${requestId}] Database connection test successful`);
    })
    .catch((error) => {
      logger.error(`[${requestId}] Database connection test failed`, { error });
      throw new Error('Database connection test failed');
    });

    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
    });

    logger.info(`[${requestId}] Successfully fetched ${clients.length} clients`);
    res.json(clients);
  } catch (error) {
    logger.error(`[${requestId}] Error in getAllClients:`, { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      errorObject: error
    });

    // Check if it's a Prisma error
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      logger.error(`[${requestId}] Prisma error:`, {
        code: error.code,
        meta: error.meta,
        clientVersion: error.clientVersion
      });
    }

    res.status(500).json({ 
      message: 'Failed to fetch clients',
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });
  }
};

export const getClient = async (req: Request, res: Response) => {
  const requestId = Math.random().toString(36).substring(7);
  logger.info(`[${requestId}] Starting getClient request`, {
    headers: req.headers,
    query: req.query,
    params: req.params
  });

  const { id } = req.params;
  try {
    logger.debug(`[${requestId}] Attempting database query`);
    
    // First test the database connection
    await prisma.$queryRaw`SELECT 1`
    .then(() => {
      logger.debug(`[${requestId}] Database connection test successful`);
    })
    .catch((error) => {
      logger.error(`[${requestId}] Database connection test failed`, { error });
      throw new Error('Database connection test failed');
    });

    const client = await prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      logger.info(`[${requestId}] Client not found`);
      return res.status(404).json({ message: 'Client not found', requestId });
    }

    logger.info(`[${requestId}] Successfully fetched client`);
    res.json(client);
  } catch (error) {
    logger.error(`[${requestId}] Error in getClient:`, { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      errorObject: error
    });

    // Check if it's a Prisma error
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      logger.error(`[${requestId}] Prisma error:`, {
        code: error.code,
        meta: error.meta,
        clientVersion: error.clientVersion
      });
    }

    res.status(500).json({ 
      message: 'Failed to fetch client',
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });
  }
};

export const createClient = async (req: Request, res: Response) => {
  const requestId = Math.random().toString(36).substring(7);
  logger.info(`[${requestId}] Starting createClient request`, {
    headers: req.headers,
    query: req.query,
    body: req.body
  });

  const { name, email, phone, address, notes } = req.body;

  if (!name || !email || !phone) {
    logger.info(`[${requestId}] Invalid request body`);
    return res.status(400).json({ message: 'Name, email, and phone are required', requestId });
  }

  try {
    logger.debug(`[${requestId}] Attempting database query`);
    
    // First test the database connection
    await prisma.$queryRaw`SELECT 1`
    .then(() => {
      logger.debug(`[${requestId}] Database connection test successful`);
    })
    .catch((error) => {
      logger.error(`[${requestId}] Database connection test failed`, { error });
      throw new Error('Database connection test failed');
    });

    const client = await prisma.client.create({
      data: {
        name,
        email,
        phone,
        address,
        notes,
      },
    });

    logger.info(`[${requestId}] Successfully created client`);
    res.status(201).json(client);
  } catch (error) {
    logger.error(`[${requestId}] Error in createClient:`, { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      errorObject: error
    });

    // Check if it's a Prisma error
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      logger.error(`[${requestId}] Prisma error:`, {
        code: error.code,
        meta: error.meta,
        clientVersion: error.clientVersion
      });

      if (error.code === 'P2002') {
        logger.info(`[${requestId}] Client with this email already exists`);
        return res.status(400).json({ message: 'A client with this email already exists', requestId });
      }
    }

    res.status(500).json({ 
      message: 'Failed to create client',
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });
  }
};

export const updateClient = async (req: Request, res: Response) => {
  const requestId = Math.random().toString(36).substring(7);
  logger.info(`[${requestId}] Starting updateClient request`, {
    headers: req.headers,
    query: req.query,
    params: req.params,
    body: req.body
  });

  const { id } = req.params;
  const { name, email, phone, address, notes } = req.body;

  try {
    logger.debug(`[${requestId}] Attempting database query`);
    
    // First test the database connection
    await prisma.$queryRaw`SELECT 1`
    .then(() => {
      logger.debug(`[${requestId}] Database connection test successful`);
    })
    .catch((error) => {
      logger.error(`[${requestId}] Database connection test failed`, { error });
      throw new Error('Database connection test failed');
    });

    const client = await prisma.client.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        address,
        notes,
      },
    });

    logger.info(`[${requestId}] Successfully updated client`);
    res.json(client);
  } catch (error) {
    logger.error(`[${requestId}] Error in updateClient:`, { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      errorObject: error
    });

    // Check if it's a Prisma error
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      logger.error(`[${requestId}] Prisma error:`, {
        code: error.code,
        meta: error.meta,
        clientVersion: error.clientVersion
      });

      if (error.code === 'P2002') {
        logger.info(`[${requestId}] Client with this email already exists`);
        return res.status(400).json({ message: 'A client with this email already exists', requestId });
      }
      if (error.code === 'P2025') {
        logger.info(`[${requestId}] Client not found`);
        return res.status(404).json({ message: 'Client not found', requestId });
      }
    }

    res.status(500).json({ 
      message: 'Failed to update client',
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });
  }
};

export const deleteClient = async (req: Request, res: Response) => {
  const requestId = Math.random().toString(36).substring(7);
  logger.info(`[${requestId}] Starting deleteClient request`, {
    headers: req.headers,
    query: req.query,
    params: req.params
  });

  const { id } = req.params;
  try {
    logger.debug(`[${requestId}] Attempting database query`);
    
    // First test the database connection
    await prisma.$queryRaw`SELECT 1`
    .then(() => {
      logger.debug(`[${requestId}] Database connection test successful`);
    })
    .catch((error) => {
      logger.error(`[${requestId}] Database connection test failed`, { error });
      throw new Error('Database connection test failed');
    });

    await prisma.client.delete({
      where: { id },
    });

    logger.info(`[${requestId}] Successfully deleted client`);
    res.status(204).send();
  } catch (error) {
    logger.error(`[${requestId}] Error in deleteClient:`, { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      errorObject: error
    });

    // Check if it's a Prisma error
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      logger.error(`[${requestId}] Prisma error:`, {
        code: error.code,
        meta: error.meta,
        clientVersion: error.clientVersion
      });

      if (error.code === 'P2025') {
        logger.info(`[${requestId}] Client not found`);
        return res.status(404).json({ message: 'Client not found', requestId });
      }
    }

    res.status(500).json({ 
      message: 'Failed to delete client',
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });
  }
};
