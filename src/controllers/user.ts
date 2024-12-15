import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export const getUsers = async (req: Request, res: Response) => {
  try {
    logger.info('Getting users');
    const { search } = req.query;
    const { salonId } = req.user as { salonId: string };

    logger.debug('Search query:', search);
    logger.debug('Salon ID:', salonId);

    const where = {
      salonId,
      ...(search
        ? {
            OR: [
              { name: { contains: search as string, mode: 'insensitive' } },
              { email: { contains: search as string, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    logger.debug('Query where clause:', where);

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info(`Found ${users.length} users`);
    logger.debug('Users:', users);

    res.json(users);
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    logger.info('Creating user');
    const { email, password, name, role } = req.body;
    const { salonId } = req.user as { salonId: string };

    logger.debug('User data:', { email, name, role });

    // Check if user with email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    logger.debug('Hashed password:', hashedPassword);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        salonId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info('User created:', user);
    res.status(201).json(user);
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    logger.info('Updating user');
    const { id } = req.params;
    const { email, password, name, role } = req.body;
    const { salonId } = req.user as { salonId: string };

    logger.debug('User ID:', id);
    logger.debug('User data:', { email, name, role });

    // Check if user exists and belongs to the salon
    const existingUser = await prisma.user.findFirst({
      where: { id, salonId },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If email is being changed, check if new email is already taken
    if (email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email },
      });

      if (emailTaken) {
        return res.status(400).json({ error: 'Email is already taken' });
      }
    }

    // Prepare update data
    const updateData: any = {
      email,
      name,
      role,
    };

    // Only update password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    logger.debug('Update data:', updateData);

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info('User updated:', user);
    res.json(user);
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    logger.info('Deleting user');
    const { id } = req.params;
    const { salonId } = req.user as { salonId: string };

    logger.debug('User ID:', id);

    // Check if user exists and belongs to the salon
    const user = await prisma.user.findFirst({
      where: { id, salonId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user
    await prisma.user.delete({
      where: { id },
    });

    logger.info('User deleted:', id);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
