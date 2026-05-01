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
router.use(requireRole('ADMIN'));

router.route('/')
  .get(getSchedules)
  .post(createSchedule);

router.post('/copy-week', copyWeekSchedule);

router.route('/:id')
  .put(updateSchedule)
  .delete(deleteSchedule);

export default router;
