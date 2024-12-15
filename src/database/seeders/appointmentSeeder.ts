import { PrismaClient, Status } from '@prisma/client';
import { addDays, subDays, setHours, setMinutes, isSameDay, format } from 'date-fns';

const prisma = new PrismaClient();

async function getRandomInt(min: number, max: number): Promise<number> {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function getRandomAppointmentDuration(): Promise<number> {
  // Duration in minutes: 30, 45, 60, 90, or 120
  const durations = [30, 45, 60, 90, 120];
  return durations[Math.floor(Math.random() * durations.length)];
}

async function isWithinWorkingHours(date: Date, therapistId: string): Promise<boolean> {
  const dayOfWeek = format(date, 'EEEE').toUpperCase();
  const workingHours = await prisma.workingHours.findFirst({
    where: {
      therapistId: therapistId,
      dayOfWeek: dayOfWeek,
      isWorkingDay: true
    }
  });

  if (!workingHours) return false;

  const timeInMinutes = date.getHours() * 60 + date.getMinutes();
  const startTimeMinutes = parseInt(workingHours.startTime.split(':')[0]) * 60 + 
                          parseInt(workingHours.startTime.split(':')[1]);
  const endTimeMinutes = parseInt(workingHours.endTime.split(':')[0]) * 60 + 
                        parseInt(workingHours.endTime.split(':')[1]);

  return timeInMinutes >= startTimeMinutes && timeInMinutes <= endTimeMinutes;
}

async function hasOverlappingAppointments(
  startTime: Date,
  endTime: Date,
  therapistId: string
): Promise<boolean> {
  const overlapping = await prisma.appointment.findFirst({
    where: {
      therapistId,
      AND: [
        {
          startTime: {
            lt: endTime
          }
        },
        {
          endTime: {
            gt: startTime
          }
        }
      ]
    }
  });

  return !!overlapping;
}

async function getAvailableTimeSlot(
  date: Date,
  therapistId: string,
  durationMinutes: number
): Promise<Date | null> {
  const dayOfWeek = format(date, 'EEEE').toUpperCase();
  const workingHours = await prisma.workingHours.findFirst({
    where: {
      therapistId: therapistId,
      dayOfWeek: dayOfWeek,
      isWorkingDay: true
    }
  });

  if (!workingHours) return null;

  const startHour = parseInt(workingHours.startTime.split(':')[0]);
  const startMinute = parseInt(workingHours.startTime.split(':')[1]);
  const endHour = parseInt(workingHours.endTime.split(':')[0]);
  const endMinute = parseInt(workingHours.endTime.split(':')[1]);

  // Try different start times with 15-minute intervals
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = (hour === startHour ? startMinute : 0); minute < 60; minute += 15) {
      if (hour === endHour && minute >= endMinute) break;

      const startTime = new Date(date);
      startTime.setHours(hour, minute, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + durationMinutes);

      if (endTime.getHours() > endHour || 
          (endTime.getHours() === endHour && endTime.getMinutes() > endMinute)) {
        break;
      }

      const hasOverlap = await hasOverlappingAppointments(startTime, endTime, therapistId);
      if (!hasOverlap) {
        return startTime;
      }
    }
  }

  return null;
}

async function seedAppointments() {
  try {
    // Clear existing appointments
    await prisma.appointment.deleteMany({});

    const clients = await prisma.client.findMany();
    const therapists = await prisma.therapist.findMany();
    const services = await prisma.service.findMany({
      where: { isActive: true }
    });

    if (clients.length === 0 || therapists.length === 0 || services.length === 0) {
      console.log('No clients, therapists, or services found. Please seed them first.');
      return;
    }

    const today = new Date();
    const startDate = subDays(today, 7);
    const endDate = addDays(today, 7);

    // Iterate through each day
    for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
      // For each therapist
      for (const therapist of therapists) {
        // Get working hours for this day
        const dayOfWeek = format(date, 'EEEE').toUpperCase();
        const hasWorkingHours = await prisma.workingHours.findFirst({
          where: {
            therapistId: therapist.id,
            dayOfWeek: dayOfWeek,
            isWorkingDay: true
          }
        });

        if (!hasWorkingHours) continue;

        // Random number of appointments for this therapist today (2-6)
        const appointmentsCount = await getRandomInt(2, 6);

        // Try to create appointments for this therapist
        for (let i = 0; i < appointmentsCount; i++) {
          const randomService = services[Math.floor(Math.random() * services.length)];
          const durationMinutes = randomService.duration;
          const startTime = await getAvailableTimeSlot(date, therapist.id, durationMinutes);

          if (startTime) {
            const endTime = new Date(startTime);
            endTime.setMinutes(endTime.getMinutes() + durationMinutes);

            // Random client
            const randomClient = clients[Math.floor(Math.random() * clients.length)];

            // Create appointment
            await prisma.appointment.create({
              data: {
                clientId: randomClient.id,
                therapistId: therapist.id,
                serviceId: randomService.id,
                startTime: startTime,
                endTime: endTime,
                status: Status.SCHEDULED,
                price: randomService.price,
                notes: `Seeded appointment for ${randomService.name}`
              }
            });
          }
        }
      }
    }

    console.log('Appointments seeded successfully!');
  } catch (error) {
    console.error('Error seeding appointments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedAppointments();
