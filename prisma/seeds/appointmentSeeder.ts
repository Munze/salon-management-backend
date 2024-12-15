import { PrismaClient } from '@prisma/client';
import { addDays, addMinutes, getHours, setHours, startOfDay } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  // Get all therapists
  const therapists = await prisma.therapist.findMany();
  
  // Get all services
  const services = await prisma.service.findMany();
  
  // Get all clients
  const clients = await prisma.client.findMany();

  if (!therapists.length || !services.length || !clients.length) {
    console.error('Please make sure you have therapists, services, and clients in the database');
    return;
  }

  // Delete existing appointments first
  await prisma.appointment.deleteMany({});

  const appointments = [];

  // For each therapist
  for (const therapist of therapists) {
    // For next 7 days
    for (let day = 0; day < 7; day++) {
      const currentDate = addDays(startOfDay(new Date()), day);
      let currentTime = setHours(currentDate, 9); // Start at 9 AM
      
      // Create appointments throughout the day, respecting service duration
      while (getHours(currentTime) < 17) { // Until 5 PM
        // Random service
        const service = services[Math.floor(Math.random() * services.length)];
        
        // Random client
        const client = clients[Math.floor(Math.random() * clients.length)];
        
        // Random status (80% scheduled, 20% cancelled)
        const status = Math.random() > 0.2 ? 'SCHEDULED' : 'CANCELLED';

        const startTime = currentTime;
        const endTime = addMinutes(startTime, service.duration);
        
        // Only add the appointment if it ends before 5 PM
        if (getHours(endTime) < 17) {
          appointments.push({
            startTime,
            endTime,
            status,
            therapistId: therapist.id,
            clientId: client.id,
            serviceId: service.id,
            price: service.price,
            notes: `Seeded appointment for testing`
          });
        }
        
        // Move current time to after this appointment (including 15 min buffer)
        currentTime = addMinutes(endTime, 15);
      }
    }
  }

  // Sort appointments by start time to avoid conflicts
  appointments.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  // Create appointments
  for (const appointment of appointments) {
    try {
      await prisma.appointment.create({
        data: appointment
      });
    } catch (error) {
      console.error(`Failed to create appointment:`, error);
    }
  }

  console.log(`Created ${appointments.length} appointments`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
