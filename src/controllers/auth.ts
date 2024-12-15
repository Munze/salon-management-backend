import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import { logger } from '../utils/logger';
import { sendEmail } from '../services/email';
import crypto from 'crypto';

export const login = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, rememberMe } = req.body;

    logger.debug(`Login attempt for email: ${email}`);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      logger.debug(`User not found with email: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.debug(`Invalid password for user: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token with appropriate expiration
    const expiresIn = rememberMe ? '30d' : '24h';
    const accessToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        salonId: user.salonId 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
      { expiresIn: '7d' }
    );

    // Remove sensitive data
    const { password: _, ...userWithoutPassword } = user;

    logger.debug(`User ${email} logged in successfully`);

    res.json({
      accessToken,
      refreshToken,
      user: userWithoutPassword
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    logger.debug(`Password reset request for email: ${email}`);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      logger.debug(`User not found with email: ${email}`);
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token to user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      } as Prisma.UserUpdateInput,
    });

    logger.debug(`Password reset token generated for user: ${email}`);

    // Send reset email
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      text: `Please click the following link to reset your password: ${resetUrl}`,
      html: `
        <p>You requested a password reset.</p>
        <p>Please click the following link to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    logger.debug(`Password reset email sent to user: ${email}`);

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    logger.error('Password reset request error:', error);
    res.status(500).json({ message: 'Server error during password reset request' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    logger.debug(`Password reset attempt with token: ${token}`);

    // Find user by reset token and check expiry
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      } as Prisma.UserWhereInput,
    });

    if (!user) {
      logger.debug(`Invalid or expired password reset token: ${token}`);
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    logger.debug(`New password hashed for user: ${user.email}`);

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      } as Prisma.UserUpdateInput,
    });

    logger.debug(`Password reset successful for user: ${user.email}`);

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    logger.error('Password reset error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    logger.debug(`Refresh token attempt with token: ${refreshToken}`);

    // Verify refresh token
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key') as any;
      
      // Find user
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        logger.debug(`User not found with ID: ${decoded.userId}`);
        return res.status(404).json({ message: 'User not found' });
      }

      // Generate new access token
      const accessToken = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role,
          salonId: user.salonId 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
      );

      logger.debug(`New access token generated for user: ${user.email}`);

      // Generate new refresh token
      const newRefreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
        { expiresIn: '7d' }
      );

      logger.debug(`New refresh token generated for user: ${user.email}`);

      res.json({
        accessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      logger.error('Invalid refresh token:', error);
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
  } catch (error) {
    logger.error('Error in refresh token:', error);
    res.status(500).json({ message: 'Server error during refresh token' });
  }
};
