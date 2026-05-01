import express from 'express';
import { getDashboard, getApprovals, approveRequest, getUsers, removeUser, toggleUserStatus } from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { submitEmployeeFeedback } from '../controllers/admin.controller.js';
import { upload } from '../middlewares/upload.middleware.js';

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

export default router;
