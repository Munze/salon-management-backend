import { Request, Response } from 'express';
import prisma from '../prisma';
import { logger } from '../utils/logger';
import { generateSerbianPassword } from '../utils/passwordGenerator';
import bcrypt from 'bcrypt';
import { UserRole, Status } from '@prisma/client';

export const getAllTherapists = async (req: Request, res: Response) => {
  try {
    const therapists = await prisma.therapist.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(therapists);
  } catch (error) {
    logger.error('Error fetching therapists:', error);
    res.status(500).json({ message: 'Failed to fetch therapists' });
  }
};

export const createTherapist = async (req: Request, res: Response) => {
  const { name, email, phone, specialties } = req.body;

  try {
    // Start a transaction to create both therapist and user
    const result = await prisma.$transaction(async (prisma) => {
      // Create therapist
      const therapist = await prisma.therapist.create({
        data: {
          name,
          email,
          phone,
          specialties,
        },
      });

      // Generate password for the user
      const password = generateSerbianPassword();
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create corresponding user account
      const user = await prisma.user.create({
        data: {
          name,
          email,
          phone,
          password: hashedPassword,
          role: UserRole.THERAPIST,
        },
      });

      return { therapist, user, password };
    });

    // Log the generated password (in production, this should be sent via email)
    logger.info(`Generated password for therapist ${name}: ${result.password}`);

    res.status(201).json({
      ...result.therapist,
      generatedPassword: result.password // Include the password in the response
    });
  } catch (error) {
    logger.error('Error creating therapist:', error);
    res.status(500).json({ message: 'Failed to create therapist' });
  }
};

export const updateTherapist = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, phone, specialties } = req.body;

  try {
    // Start a transaction to update both therapist and user
    await prisma.$transaction(async (prisma) => {
      // Update therapist
      const therapist = await prisma.therapist.update({
        where: { id },
        data: {
          name,
          email,
          phone,
          specialties,
        },
      });

      // Update corresponding user account
      await prisma.user.updateMany({
        where: { email: therapist.email },
        data: {
          name,
          email,
          phone,
        },
      });

      return therapist;
    });

    res.json({ message: 'Therapist and user account updated successfully' });
  } catch (error) {
    logger.error('Error updating therapist:', error);
    res.status(500).json({ message: 'Failed to update therapist' });
  }
};

export const deleteTherapist = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Start a transaction to check and delete therapist and user
    await prisma.$transaction(async (prisma) => {
      // Get therapist and check for appointments
      const therapist = await prisma.therapist.findUnique({
        where: { id },
        include: {
          appointments: {
            where: {
              OR: [
                { status: Status.SCHEDULED },
                { status: Status.CONFIRMED },
                { status: Status.IN_PROGRESS }
              ]
            }
          },
          scheduleSettings: true,
          user: true
        }
      });

      if (!therapist) {
        throw new Error('Therapist not found');
      }

      // Check for active appointments
      if (therapist.appointments.length > 0) {
        return res.status(400).json({ 
          message: 'Ne možete obrisati terapeuta koji ima zakazane termine. Prvo otkažite ili promenite terapeuta za postojeće termine.' 
        });
      }

      // Delete schedule settings
      if (therapist.scheduleSettings.length > 0) {
        await prisma.scheduleSettings.deleteMany({
          where: { therapistId: id }
        });
      }

      // Delete completed/cancelled appointments
      await prisma.appointment.deleteMany({
        where: { 
          therapistId: id,
          status: {
            in: [Status.COMPLETED, Status.CANCELLED, Status.NO_SHOW]
          }
        }
      });

      // Delete therapist
      await prisma.therapist.delete({
        where: { id }
      });

      // Delete corresponding user account
      await prisma.user.delete({
        where: { id: therapist.userId }
      });
    });

    res.status(204).send();
  } catch (error: any) {
    logger.error('Error deleting therapist:', error);
    
    // Check if this is our custom error message
    if (error.response?.status === 400) {
      return res.status(400).json({ message: error.response.data.message });
    }
    
    res.status(500).json({ 
      message: 'Došlo je do greške prilikom brisanja terapeuta.' 
    });
  }
};

export const getTherapistById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const therapist = await prisma.therapist.findUnique({
      where: { id },
    });

    if (!therapist) {
      return res.status(404).json({ message: 'Therapist not found' });
    }

    res.json(therapist);
  } catch (error) {
    logger.error('Error fetching therapist:', error);
    res.status(500).json({ message: 'Failed to fetch therapist' });
  }
};
