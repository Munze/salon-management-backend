import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { body } from 'express-validator';
import { login, refreshToken, requestPasswordReset, resetPassword } from './controllers/auth';
import { getUsers, createUser, updateUser, deleteUser } from './controllers/user';
import { authenticate } from './middleware/auth';
import { authorize } from './middleware/authorize';
import { logger } from './utils/logger';

config();

const app = express();

// Debug middleware to log all requests
app.use((req, res, next) => {
  logger.info(`[DEBUG] ${req.method} ${req.path}`);
  logger.debug('Request headers:', req.headers);
  next();
});

// CORS configuration
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
  logger.info('Test route hit');
  res.json({ message: 'Server is working' });
});

// Auth routes (no authentication required)
app.post('/api/auth/login', [
  body('email').isEmail(),
  body('password').exists(),
], login);

app.post('/api/auth/refresh-token', refreshToken);
app.post('/api/auth/request-reset', requestPasswordReset);
app.post('/api/auth/reset-password', resetPassword);

// User management routes
const userRouter = express.Router();

userRouter.use(authenticate);
userRouter.use(authorize(['ADMIN']));

userRouter.get('/', (req, res, next) => {
  logger.info('GET /api/users route hit');
  logger.debug('User object:', req.user);
  next();
}, getUsers);

userRouter.post('/', createUser);
userRouter.put('/:id', updateUser);
userRouter.delete('/:id', deleteUser);

app.use('/api/users', userRouter);

// Debug middleware to log route registration
logger.info('Available routes:');
app._router.stack.forEach((middleware: any) => {
  if (middleware.route) {
    const methods = Object.keys(middleware.route.methods).join(',').toUpperCase();
    logger.info(`${methods} ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    logger.info(`Router middleware: ${middleware.regexp}`);
    if (middleware.handle.stack) {
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          const methods = Object.keys(handler.route.methods).join(',').toUpperCase();
          logger.info(`  ${methods} ${handler.route.path}`);
        }
      });
    }
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  logger.warn(`404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Not Found' });
});

// Export the app
export default app;
