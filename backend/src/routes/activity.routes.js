import express from 'express';
import {
  getStatus,
  markActive,
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  getAdminFeed,
} from '../controllers/activity.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/status', requireRole('EMPLOYEE'), getStatus);
router.post('/mark-active', requireRole('EMPLOYEE'), markActive);
router.get('/notifications', getNotifications);
router.get('/notifications/unread-count', getUnreadCount);
router.patch('/notifications/:id/read', markNotificationRead);
router.get('/admin/feed', requireRole('ADMIN'), getAdminFeed);

export default router;
