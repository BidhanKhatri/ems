import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import { errorHandler } from './middlewares/error.middleware.js';
import ApiError from './utils/ApiError.js';
import initCronJobs from './jobs/employeeOfMonth.job.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { init as initSocket } from './socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRoutes from './routes/auth.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import adminRoutes from './routes/admin.routes.js';
import groupRoutes from './routes/group.routes.js';
import settingRoutes from './routes/setting.routes.js';
import activityRoutes from './routes/activity.routes.js';
import scheduleRoutes from './routes/schedule.routes.js';
import userRoutes from './routes/user.routes.js';

// app setup
const app = express();
const server = createServer(app);

// Initialize Socket.io
initSocket(server);

// Connect to MongoDB
connectDB();
initCronJobs();

// Security HTTP headers
app.use(helmet());

// Parse generic json and urlencoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(cors());

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rate Limiting
const isProduction = process.env.NODE_ENV === 'production';
const initLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 100 : 1000,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
if (isProduction || process.env.ENABLE_DEV_RATE_LIMIT === 'true') {
  app.use('/api', initLimiter);
}

// Setup routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
  res.send('EMS API is running.');
});

// Unknown API routes
app.use((req, res, next) => {
  next(new ApiError(404, 'Not found'));
});

// Centralized error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
