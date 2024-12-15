import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import bcrypt from 'bcrypt';

// Get all users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    logger.info('Fetching all users');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json(users);
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// Create a new user
export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, name, password, role, phone } = req.body;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        phone,
        salonId: 'default-salon', // Using the default salon
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    logger.info(`Created new user: ${user.email}`);
    res.status(201).json(user);
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
};

// Update a user
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, name, role, phone, password } = req.body;
    
    logger.debug('Updating user:', { id, email, name, role, phone });

    // Check if email is being changed and if it's already taken
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          id: { not: id },
        },
      });

      if (existingUser) {
        return res.status(400).json({ message: 'Email is already taken' });
      }
    }

    // Prepare update data
    const updateData: any = {
      email,
      name,
      role,
      phone,
    };

    // Only hash and update password if it's provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Remove undefined fields
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    logger.info(`Updated user: ${user.email}`);
    res.json(user);
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({ 
      message: 'Error updating user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete a user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      include: { therapist: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Start a transaction to handle related records
    await prisma.$transaction(async (tx) => {
      // If user is a therapist, delete therapist record first
      if (user.therapist) {
        await tx.therapist.delete({
          where: { userId: id }
        });
      }

      // Delete the user
      await tx.user.delete({
        where: { id }
      });
    });

    logger.info(`Deleted user: ${user.email}`);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
};
