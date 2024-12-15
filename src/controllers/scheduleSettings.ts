import { Request, Response } from 'express';
import prisma from '../prisma';
import { logger } from '../utils/logger';

export const getScheduleSettings = async (req: Request, res: Response) => {
  try {
    logger.info(`Getting schedule settings for request: ${req.method} ${req.path}`);
    logger.debug('Request user object:', req.user);
    
    // For now, use a default salon ID if none is present
    const salonId = req.user?.salonId || 'default-salon';
    logger.debug(`Using salon ID: ${salonId}`);

    logger.debug(`Fetching schedule settings for salon ID: ${salonId}`);
    let settings = await prisma.scheduleSettings.findFirst({
      where: {
        salonId
      }
    });
    
    if (!settings) {
      logger.info(`No settings found for salon ${salonId}, creating default settings`);
      // Create default settings if none exist
      const defaultWorkingHours = Array.from({ length: 7 }, (_, i) => ({
        day: i,
        isOpen: i !== 0, // Closed on Sundays by default
        openTime: '09:00',
        closeTime: '17:00'
      }));

      try {
        settings = await prisma.scheduleSettings.create({
          data: {
            salonId,
            workingHours: defaultWorkingHours,
            defaultAppointmentDuration: 60,
            bufferBetweenAppointments: 15,
            maxAdvanceBookingDays: 30,
            minAdvanceBookingHours: 24
          }
        });
        logger.info('Successfully created default schedule settings');
      } catch (createError) {
        logger.error('Error creating default schedule settings:', createError);
        throw createError;
      }
    } else {
      logger.debug('Found existing schedule settings');
    }

    logger.debug('Returning schedule settings:', settings);
    res.json(settings);
  } catch (error) {
    logger.error('Error in getScheduleSettings:', error);
    res.status(500).json({ message: 'Greška pri učitavanju podešavanja rasporeda' });
  }
};

export const updateScheduleSettings = async (req: Request, res: Response) => {
  try {
    logger.info(`Updating schedule settings for request: ${req.method} ${req.path}`);
    logger.debug('Request user object:', req.user);
    logger.debug('Request body:', req.body);
    
    // For now, use a default salon ID if none is present
    const salonId = req.user?.salonId || 'default-salon';
    logger.debug(`Using salon ID: ${salonId}`);

    const updatedSettings = await prisma.scheduleSettings.upsert({
      where: {
        salonId
      },
      update: req.body,
      create: {
        salonId,
        ...req.body
      }
    });

    logger.info('Successfully updated schedule settings');
    logger.debug('Updated settings:', updatedSettings);
    res.json(updatedSettings);
  } catch (error) {
    logger.error('Error in updateScheduleSettings:', error);
    res.status(500).json({ message: 'Greška pri ažuriranju podešavanja rasporeda' });
  }
};
