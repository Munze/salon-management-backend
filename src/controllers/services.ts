import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../prisma';
import { logger } from '../utils/logger';

const prismaClient = prisma;

export const getAllServices = async (req: Request, res: Response) => {
  try {
    const services = await prismaClient.service.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    logger.info(`Successfully fetched ${services.length} services`);
    res.json(services);
  } catch (error) {
    logger.error('Error fetching services:', error);
    res.status(500).json({ 
      message: 'Failed to fetch services',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getServiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      logger.warn('Service ID not provided');
      return res.status(400).json({ message: 'Service ID is required' });
    }

    const service = await prismaClient.service.findUnique({
      where: { id },
    });

    if (!service) {
      logger.warn(`Service not found with ID: ${id}`);
      return res.status(404).json({ message: 'Service not found' });
    }

    logger.info(`Successfully fetched service with ID: ${id}`);
    res.json(service);
  } catch (error) {
    logger.error(`Error fetching service with ID ${req.params.id}:`, error);
    res.status(500).json({ 
      message: 'Failed to fetch service',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createService = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in create service request:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, duration, price, description } = req.body;

    if (!name || !duration || !price) {
      logger.warn('Missing required fields in create service request');
      return res.status(400).json({ message: 'Name, duration, and price are required' });
    }

    const service = await prismaClient.service.create({
      data: {
        name,
        duration,
        price,
        description,
        isActive: true,
      },
    });

    logger.info(`Successfully created service with ID: ${service.id}`);
    res.status(201).json(service);
  } catch (error) {
    logger.error('Error creating service:', error);
    res.status(500).json({ 
      message: 'Failed to create service',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateService = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in update service request:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, duration, price, description, isActive } = req.body;

    if (!id) {
      logger.warn('Service ID not provided');
      return res.status(400).json({ message: 'Service ID is required' });
    }

    if (!name || !duration || !price) {
      logger.warn('Missing required fields in update service request');
      return res.status(400).json({ message: 'Name, duration, and price are required' });
    }

    const service = await prismaClient.service.update({
      where: { id },
      data: {
        name,
        duration,
        price,
        description,
        isActive,
      },
    });

    logger.info(`Successfully updated service with ID: ${id}`);
    res.json(service);
  } catch (error) {
    logger.error(`Error updating service with ID ${req.params.id}:`, error);
    res.status(500).json({ 
      message: 'Failed to update service',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      logger.warn('Service ID not provided');
      return res.status(400).json({ message: 'Service ID is required' });
    }

    await prismaClient.service.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info(`Successfully deleted service with ID: ${id}`);
    res.status(204).send();
  } catch (error) {
    logger.error(`Error deleting service with ID ${req.params.id}:`, error);
    res.status(500).json({ 
      message: 'Failed to delete service',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
