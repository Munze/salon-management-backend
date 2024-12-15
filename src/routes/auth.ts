import express from 'express';
import { body } from 'express-validator';
import { login, requestPasswordReset, resetPassword, refreshToken } from '../controllers/auth';

const router = express.Router();

// Login route
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
    body('rememberMe').optional().isBoolean(),
  ],
  login
);

// Password reset request route
router.post(
  '/request-password-reset',
  [body('email').isEmail().withMessage('Please enter a valid email')],
  requestPasswordReset
);

// Password reset route
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
  ],
  resetPassword
);

// Refresh token route
router.post('/refresh-token', refreshToken);

export default router;
