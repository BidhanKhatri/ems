import express from 'express';
import { checkIn, checkOut, getMyAttendance, getMyPerformance } from '../controllers/attendance.controller.js';
import { getEmployeeLeaderboard } from '../controllers/admin.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/me', getMyAttendance);
router.get('/performance', getMyPerformance);
router.get('/leaderboard', getEmployeeLeaderboard);

export default router;
