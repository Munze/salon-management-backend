import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';

export const checkRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
      }

      next();
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};

// Middleware specifically for checking if user is accessing their own data
export const checkTherapistAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const requestedTherapistId = req.params.therapistId || req.body.therapistId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    // If user is admin, allow access
    if (user?.role === 'ADMIN') {
      return next();
    }

    // For therapists, check if they're accessing their own data
    if (user?.role === 'THERAPIST' && userId === requestedTherapistId) {
      return next();
    }

    return res.status(403).json({ message: 'Forbidden: Can only access your own data' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
