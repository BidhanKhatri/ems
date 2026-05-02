import express from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  copyWeekSchedule,
} from '../controllers/schedule.controller.js';

const router = express.Router();

router.use(requireAuth);
// router.use(requireRole('ADMIN')); // Removed global admin check

router.route('/')
  .get(getSchedules)
  .post(requireRole('ADMIN'), createSchedule);

router.post('/copy-week', requireRole('ADMIN'), copyWeekSchedule);

router.route('/:id')
  .put(requireRole('ADMIN'), updateSchedule)
  .delete(requireRole('ADMIN'), deleteSchedule);

export default router;
