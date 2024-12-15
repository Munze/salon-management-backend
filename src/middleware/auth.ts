import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface JwtPayload {
  userId: string;
  email: string;
  role: 'ADMIN' | 'THERAPIST';
  salonId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
        salonId: string;
      };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info(`Authenticating request to: ${req.method} ${req.path}`);
    const authHeader = req.header('Authorization');
    logger.debug(`Auth header: ${authHeader ? 'Present' : 'Missing'}`);
    
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      logger.warn('No token provided in request');
      return res.status(401).json({ message: 'Authentication required' });
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key'
      ) as JwtPayload;

      if (!decoded.role) {
        logger.warn(`No role found in token for user ${decoded.userId}`);
        return res.status(401).json({ message: 'Invalid token: missing role' });
      }

      logger.debug(`Token decoded successfully. User ID: ${decoded.userId}, Role: ${decoded.role}, Email: ${decoded.email}`);
      req.user = decoded;
      next();
    } catch (jwtError) {
      logger.error('JWT verification failed:', jwtError);
      res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({ message: 'Internal server error during authentication' });
  }
};
