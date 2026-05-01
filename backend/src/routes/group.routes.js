import express from 'express';
import { createGroup, updateGroup, deleteGroup, getGroups, addMembers, removeMember, broadcastEmail } from '../controllers/group.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('ADMIN'));

router.get('/', getGroups);
router.post('/', createGroup);
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);

// Member management
router.post('/:id/members', addMembers);
router.delete('/:id/members/:userId', removeMember);

// Broadcast email
router.post('/:id/broadcast', broadcastEmail);

export default router;
