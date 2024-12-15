import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Create default salon if it doesn't exist
  console.log('Creating default salon...');
  const defaultSalon = await prisma.salon.upsert({
    where: { id: 'default-salon' },
    update: {},
    create: {
      name: 'Default Salon',
      address: '123 Main St',
      phone: '123-456-7890',
    },
  });
  console.log('Default salon created:', defaultSalon);

  // Create admin user if it doesn't exist
  console.log('Creating admin user...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@mail.com' },
    update: {},
    create: {
      email: 'admin@mail.com',
      password: adminPassword,
      name: 'Admin User',
      role: UserRole.ADMIN,
      salonId: defaultSalon.id,
    },
  });
  console.log('Admin user created:', { email: adminUser.email, role: adminUser.role });

  // Create a default therapist if it doesn't exist
  console.log('Creating default therapist...');
  const therapistPassword = await bcrypt.hash('therapist123', 10);
  const therapistUser = await prisma.user.upsert({
    where: { email: 'therapist@mail.com' },
    update: {},
    create: {
      email: 'therapist@mail.com',
      password: therapistPassword,
      name: 'Default Therapist',
      role: UserRole.THERAPIST,
      salonId: defaultSalon.id,
    },
  });
  console.log('Default therapist created:', { email: therapistUser.email, role: therapistUser.role });

  // Create or update the therapist profile
  console.log('Creating or updating therapist profile...');
  const therapist = await prisma.therapist.upsert({
    where: { userId: therapistUser.id },
    update: {},
    create: {
      name: therapistUser.name,
      email: therapistUser.email,
      phone: '123-456-7890',
      specialties: ['Massage', 'Facial'],
      userId: therapistUser.id,
    },
  });
  console.log('Therapist profile created or updated:', therapist);

  // Create default working hours for the therapist
  console.log('Creating default working hours for the therapist...');
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  const workingHours = days.map(day => ({
    id: `${therapist.id}-${day}`,
    dayOfWeek: day,
    startTime: '09:00',
    endTime: '17:00',
    isWorkingDay: true,
    therapistId: therapist.id,
  }));

  // Create weekend hours (not working days)
  const weekendDays = ['SATURDAY', 'SUNDAY'];
  const weekendHours = weekendDays.map(day => ({
    id: `${therapist.id}-${day}`,
    dayOfWeek: day,
    startTime: '00:00',
    endTime: '00:00',
    isWorkingDay: false,
    therapistId: therapist.id,
  }));

  // Combine all schedule settings
  const allScheduleSettings = [...workingHours, ...weekendHours];

  // Create or update schedule settings for each day
  console.log('Creating or updating schedule settings...');
  for (const settings of allScheduleSettings) {
    await prisma.scheduleSettings.upsert({
      where: { id: settings.id },
      update: settings,
      create: settings,
    });
  }
  console.log('Schedule settings created or updated');

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
