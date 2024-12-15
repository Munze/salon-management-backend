import { CronJob } from 'cron';
import { addHours, isFuture } from 'date-fns';
import { logger } from '../utils/logger';
import { sendAppointmentReminder } from './email';
import prisma from '../prisma';

// Send reminders 24 hours before appointment
export const startReminderScheduler = () => {
  // Run every hour to check for appointments that need reminders
  const job = new CronJob('0 0 * * * *', async () => {
    try {
      // Get all confirmed appointments in the next 25 hours that haven't had reminders sent
      const appointments = await prisma.appointment.findMany({
        where: {
          status: 'CONFIRMED',
          reminderSent: false,
          startTime: {
            gt: new Date(),
            lt: addHours(new Date(), 25), // Look ahead 25 hours
          },
        },
        include: {
          client: true,
          therapist: true,
          service: true,
        },
      });

      for (const appointment of appointments) {
        // Only send reminder if appointment is still in the future
        if (appointment.client?.email && isFuture(appointment.startTime)) {
          try {
            await sendAppointmentReminder(
              appointment.client.email,
              {
                clientName: appointment.client.name,
                therapistName: appointment.therapist?.name || 'Your Therapist',
                serviceName: appointment.service?.name || 'Your Service',
                startTime: appointment.startTime,
                endTime: appointment.endTime,
              }
            );

            // Mark reminder as sent
            await prisma.appointment.update({
              where: { id: appointment.id },
              data: { reminderSent: true },
            });

            logger.info(`Reminder sent for appointment ${appointment.id}`);
          } catch (error) {
            logger.error(`Failed to send reminder for appointment ${appointment.id}:`, error);
          }
        }
      }
    } catch (error) {
      logger.error('Error in reminder scheduler:', error);
    }
  });

  job.start();
  logger.info('Reminder scheduler started');

  return job;
};
