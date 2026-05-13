import express from 'express';
import {
  getDashboard, getApprovals, approveRequest,
  getUsers, removeUser, toggleUserStatus,
  submitEmployeeFeedback, getEmployeeAttendance,
  getAccountApprovals, updateAccountApprovalStatus,
  sendBroadcastNotification
} from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('ADMIN'));

router.get('/dashboard', getDashboard);
router.get('/approvals', getApprovals);
router.post('/approve/:id', approveRequest);

// User Management
router.get('/users', getUsers);
router.delete('/users/:id', removeUser);
router.patch('/users/:id/status', toggleUserStatus);
router.post('/users/:id/feedback', upload.single('image'), submitEmployeeFeedback);
router.get('/users/:id/attendance', getEmployeeAttendance);

// Account Approvals
router.get('/account-approvals', getAccountApprovals);
router.patch('/account-approvals/:id', updateAccountApprovalStatus);

// Notifications
router.post('/notifications/broadcast', sendBroadcastNotification);

export default router;
