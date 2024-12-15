import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { DayOfWeek } from '@prisma/client';

// Working Hours
export const getWorkingHours = async (req: Request, res: Response) => {
  const { therapistId } = req.query;
  try {
    logger.debug('Fetching working hours for therapist:', therapistId);
    
    const scheduleSettings = await prisma.scheduleSettings.findMany({
      where: therapistId ? { therapistId: therapistId as string } : {},
      orderBy: { dayOfWeek: 'asc' },
      include: {
        therapist: {
          select: {
            name: true,
            email: true,
            specialties: true
          }
        }
      }
    });

    // Transform schedule settings to working hours format
    const workingHours = scheduleSettings.map(setting => ({
      id: setting.id,
      therapistId: setting.therapistId,
      dayOfWeek: setting.dayOfWeek,
      startTime: setting.startTime,
      endTime: setting.endTime,
      isWorkingDay: setting.isWorkingDay,
      therapistName: setting.therapist.name,
      therapistEmail: setting.therapist.email,
      specialties: setting.therapist.specialties
    }));

    logger.debug('Found working hours:', workingHours);
    res.json(workingHours);
  } catch (error) {
    logger.error('Error fetching working hours:', error);
    res.status(500).json({ message: 'Failed to fetch working hours' });
  }
};

export const updateWorkingHours = async (req: Request, res: Response) => {
  const workingHoursData = req.body;
  try {
    logger.debug('Received working hours data:', JSON.stringify(workingHoursData, null, 2));
    
    // Validate the input data
    if (!Array.isArray(workingHoursData)) {
      logger.error('Invalid working hours data: not an array');
      return res.status(400).json({ message: 'Invalid working hours data format' });
    }

    // Validate each working hours entry
    for (const hours of workingHoursData) {
      if (!hours.dayOfWeek || !hours.startTime || !hours.endTime) {
        logger.error('Invalid working hours entry:', hours);
        return res.status(400).json({ 
          message: 'Invalid working hours data: missing required fields',
          invalidEntry: hours 
        });
      }

      // Validate time format (HH:mm)
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(hours.startTime) || !timeRegex.test(hours.endTime)) {
        logger.error('Invalid time format:', { startTime: hours.startTime, endTime: hours.endTime });
        return res.status(400).json({ 
          message: 'Invalid time format. Use HH:mm format (24-hour)',
          invalidEntry: hours 
        });
      }
    }

    // Wrap the operations in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing schedule settings for the therapist
      if (workingHoursData[0]?.therapistId) {
        await tx.scheduleSettings.deleteMany({
          where: {
            therapistId: workingHoursData[0].therapistId,
          },
        });
      }

      // Create new schedule settings
      const sanitizedData = workingHoursData.map(({ id, therapistName, therapistEmail, specialties, ...rest }) => {
        // Ensure time format is correct (HH:mm)
        const formatTime = (time: string) => {
          if (!time) return '00:00';
          const [hours, minutes] = time.split(':');
          return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        };

        return {
          id: `${rest.therapistId || 'default'}-${rest.dayOfWeek}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          startTime: formatTime(rest.startTime),
          endTime: formatTime(rest.endTime),
          isWorkingDay: typeof rest.isWorkingDay === 'boolean' ? rest.isWorkingDay : true,
          dayOfWeek: rest.dayOfWeek,
          therapistId: rest.therapistId
        };
      });

      // Create all schedule settings
      const createdSettings = await Promise.all(
        sanitizedData.map(data =>
          tx.scheduleSettings.create({
            data,
            include: {
              therapist: {
                select: {
                  name: true,
                  email: true,
                  specialties: true
                }
              }
            }
          })
        )
      );

      return createdSettings;
    });

    logger.debug('Created schedule settings:', JSON.stringify(result, null, 2));
    res.json(result);
  } catch (error) {
    logger.error('Database error while updating working hours:', error);
    res.status(500).json({ message: 'Failed to update working hours', error: error.message });
  }
};

// Schedule Exceptions
export const getScheduleExceptions = async (req: Request, res: Response) => {
  const { therapistId, startDate, endDate } = req.query;
  try {
    logger.debug('Fetching schedule exceptions:', { therapistId, startDate, endDate });

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Missing required date range parameters',
        required: { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' }
      });
    }

    const exceptions = await prisma.scheduleException.findMany({
      where: {
        therapistId: therapistId ? therapistId as string : undefined,
        date: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        },
      },
      include: {
        therapist: {
          select: {
            name: true,
            email: true,
            specialties: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    logger.debug(`Found ${exceptions.length} exceptions`);
    res.json(exceptions);
  } catch (error) {
    logger.error('Error fetching schedule exceptions:', error);
    res.status(500).json({ 
      message: 'Failed to fetch schedule exceptions',
      error: error.message 
    });
  }
};

export const createScheduleException = async (req: Request, res: Response) => {
  const exceptionData = req.body;
  try {
    logger.debug('Creating schedule exception:', exceptionData);

    const exception = await prisma.scheduleException.create({
      data: {
        date: new Date(exceptionData.date),
        startTime: exceptionData.startTime,
        endTime: exceptionData.endTime,
        isWorkingDay: exceptionData.isWorkingDay ?? true,
        note: exceptionData.note,
        therapistId: exceptionData.therapistId,
      },
      include: {
        therapist: {
          select: {
            name: true,
            email: true,
            specialties: true
          }
        }
      }
    });

    logger.debug('Created schedule exception:', exception);
    res.json(exception);
  } catch (error) {
    logger.error('Error creating schedule exception:', error);
    res.status(500).json({ 
      message: 'Failed to create schedule exception',
      error: error.message 
    });
  }
};

export const updateScheduleException = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const exception = await prisma.scheduleException.update({
      where: { id },
      data: req.body,
      include: {
        therapist: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    res.json(exception);
  } catch (error) {
    logger.error('Error updating schedule exception:', error);
    res.status(500).json({ 
      message: 'Failed to update schedule exception',
      error: error.message 
    });
  }
};

export const deleteScheduleException = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.scheduleException.delete({
      where: { id }
    });
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting schedule exception:', error);
    res.status(500).json({ 
      message: 'Failed to delete schedule exception',
      error: error.message 
    });
  }
};

// Availability
const dayNames: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export const checkAvailability = async (req: Request, res: Response) => {
  const { startTime, endTime, therapistId } = req.body;
  try {
    logger.info('=== AVAILABILITY CHECK START ===');
    logger.info('Request body:', { startTime, endTime, therapistId });

    const appointmentStart = new Date(startTime as string);
    const appointmentEnd = new Date(endTime as string);
    
    // Get local date by adjusting for timezone offset
    const localDate = new Date(appointmentStart.getTime());
    const dayOfWeek = dayNames[localDate.getDay()];
    
    logger.info(`Checking working hours for ${dayOfWeek} (${appointmentStart.toISOString()})`);

    // Query schedule settings for the specific day and therapist
    const scheduleSettings = await prisma.scheduleSettings.findFirst({
      where: {
        dayOfWeek,
        therapistId: therapistId as string,
        isWorkingDay: true
      }
    });

    if (!scheduleSettings) {
      logger.info(`No working hours found for ${dayOfWeek} or not a working day`);
      return res.json({ 
        available: false, 
        reason: 'outside_working_hours', 
        message: `No working hours found for ${dayOfWeek}` 
      });
    }

    // Parse working hours time strings
    const [startHour, startMinute] = scheduleSettings.startTime.split(':').map(Number);
    const [endHour, endMinute] = scheduleSettings.endTime.split(':').map(Number);
    
    // Convert appointment times to minutes for comparison
    const appointmentStartMinutes = appointmentStart.getHours() * 60 + appointmentStart.getMinutes();
    const appointmentEndMinutes = appointmentEnd.getHours() * 60 + appointmentEnd.getMinutes();
    const workingStartMinutes = startHour * 60 + startMinute;
    const workingEndMinutes = endHour * 60 + endMinute;

    // Check if appointment is within working hours
    if (appointmentStartMinutes < workingStartMinutes || appointmentEndMinutes > workingEndMinutes) {
      logger.info('Appointment is outside working hours', {
        appointmentTime: `${appointmentStartMinutes}-${appointmentEndMinutes}`,
        workingHours: `${workingStartMinutes}-${workingEndMinutes}`
      });
      return res.json({ 
        available: false, 
        reason: 'outside_working_hours',
        message: `Appointment time is outside working hours (${scheduleSettings.startTime}-${scheduleSettings.endTime})`
      });
    }

    logger.info('Appointment is within working hours, checking for conflicts...');

    // Check for overlapping appointments
    const conflictingAppointments = await prisma.appointment.findFirst({
      where: {
        therapistId: therapistId as string,
        OR: [
          {
            AND: [
              { startTime: { lte: appointmentStart } },
              { endTime: { gt: appointmentStart } }
            ]
          },
          {
            AND: [
              { startTime: { lt: appointmentEnd } },
              { endTime: { gte: appointmentEnd } }
            ]
          },
          {
            AND: [
              { startTime: { gte: appointmentStart } },
              { endTime: { lte: appointmentEnd } }
            ]
          }
        ],
        status: {
          notIn: ['CANCELLED', 'NO_SHOW']
        }
      },
    });

    if (conflictingAppointments) {
      logger.info('Conflicting appointment found:', conflictingAppointments);
      return res.json({ 
        available: false, 
        reason: 'overlap',
        message: 'This time slot conflicts with another appointment'
      });
    }

    res.json({ available: true });
  } catch (error) {
    logger.error('Database error while checking availability:', error);
    res.status(500).json({ message: 'Failed to check availability' });
  }
};
