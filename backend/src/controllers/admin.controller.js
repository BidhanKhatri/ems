import catchAsync from '../utils/catchAsync.js';
import * as adminService from '../services/admin.service.js';
import User from '../models/User.js';

export const getDashboard = catchAsync(async (req, res) => {
  const stats = await adminService.getDashboardStats();
  res.status(200).send(stats);
});

export const getApprovals = catchAsync(async (req, res) => {
  const approvals = await adminService.getPendingApprovals();
  res.status(200).send(approvals);
});

export const approveRequest = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { isApproved } = req.body;
  const request = await adminService.processApproval(id, req.user.id, isApproved);
  res.status(200).send({
    message: `Request ${isApproved ? 'approved' : 'rejected'} sequentially`,
    request
  });
});

export const getUsers = catchAsync(async (req, res) => {
  const result = await adminService.getUsers(req.query);
  res.status(200).send(result);
});

export const removeUser = catchAsync(async (req, res) => {
  await adminService.deleteUser(req.params.id);
  res.status(200).send({ message: 'User removed successfully' });
});

export const toggleUserStatus = catchAsync(async (req, res) => {
  const user = await adminService.toggleUserStatus(req.params.id);
  res.status(200).send({
    message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
    user
  });
});

export const submitEmployeeFeedback = catchAsync(async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.id;
  const { text, points } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const result = await adminService.processFeedback(id, adminId, { text, points: Number(points || 0), imageUrl });
  res.status(200).send({
    message: 'Feedback submitted successfully',
    result
  });
});

export const getEmployeeLeaderboard = catchAsync(async (req, res) => {
  const requestingUserId = req.user.id;
  
  const users = await User.find({ role: 'EMPLOYEE', isActive: true })
    .select('name performanceScore totalPoints')
    .sort({ performanceScore: -1 })
    .lean();

  const leaderboard = users.map((u, index) => {
    const isSelf = u._id.toString() === requestingUserId;
    const nameParts = u.name.split(' ');
    // Mask: show first letter, rest as *** for each word except self
    const maskedName = isSelf
      ? u.name
      : nameParts.map(part => part[0] + '***').join(' ');

    return {
      rank: index + 1,
      isSelf,
      name: maskedName,
      performanceScore: u.performanceScore ?? 0,
    };
  });

  // Find self rank
  const selfEntry = leaderboard.find(e => e.isSelf);

  res.status(200).send({ leaderboard, selfRank: selfEntry?.rank ?? null });
});
