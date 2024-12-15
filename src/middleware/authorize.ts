import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const userRole = req.user?.role;

      if (!userRole || !allowedRoles.includes(userRole)) {
        logger.warn(`Unauthorized access attempt by user with role ${userRole}`);
        return res.status(403).json({ error: 'Unauthorized access' });
      }

      next();
    } catch (error) {
      logger.error('Error in authorization middleware:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};
