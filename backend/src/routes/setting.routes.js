import express from 'express';
import { 
  getSettings, updateSettings, 
  getHolidays, createHoliday, deleteHoliday, 
  getTodayStatus 
} from '../controllers/setting.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);

// Accessible by all users
router.get('/today-status', getTodayStatus);
router.get('/', getSettings);
router.get('/holidays', getHolidays);

// Accessible by ADMIN only
router.use(requireRole('ADMIN'));
router.put('/', updateSettings);
router.post('/holidays', createHoliday);
router.delete('/holidays/:id', deleteHoliday);

export default router;
