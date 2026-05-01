import mongoose from 'mongoose';
import Attendance from '../models/Attendance.js';
import ApprovalRequest from '../models/ApprovalRequest.js';
import User from '../models/User.js';
import Group from '../models/Group.js';
import PerformanceLog from '../models/PerformanceLog.js';
import ActivityLog from '../models/ActivityLog.js';
import SystemSettings from '../models/SystemSettings.js';
import ApiError from '../utils/ApiError.js';

export const getDashboardStats = async () => {
  const totalEmployees = await User.countDocuments({ role: 'EMPLOYEE' });
  const totalGroups = await Group.countDocuments();
  const pendingApprovals = await ApprovalRequest.countDocuments({ status: 'PENDING' });
  
  const today = new Date().toISOString().split('T')[0];
  const todayAttendances = await Attendance.countDocuments({ date: today });
  const settings = await SystemSettings.findOne();
  const trackingEnabled = (settings?.activitySessionMinutes || 0) > 0;
  const activeTrackingNow = trackingEnabled
    ? await Attendance.countDocuments({ date: today, checkOutTime: null })
    : 0;
  const missedActivityToday = await ActivityLog.countDocuments({
    type: 'MISSED',
    timestamp: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
  });

  const allEmployees = await User.find({ role: 'EMPLOYEE' })
    .sort({ performanceScore: -1 })
    .select('name email performanceScore totalPoints groupId createdAt');

  // Enrich with attendance count and points last 7 days trend
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const enriched = await Promise.all(allEmployees.map(async (emp, idx) => {
    const totalAttendance = await Attendance.countDocuments({ userId: emp._id });

    // Sum points for last 7 days vs prior 7 days to compute trend
    const recentPoints = await PerformanceLog.aggregate([
      { $match: { userId: emp._id, date: { $gte: sevenDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$points' } } }
    ]);
    const priorPoints = await PerformanceLog.aggregate([
      { $match: { userId: emp._id, date: { $gte: fourteenDaysAgo, $lte: sevenDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$points' } } }
    ]);

    const recent = recentPoints[0]?.total ?? 0;
    const prior = priorPoints[0]?.total ?? 0;
    const trend = recent - prior; // positive = uptrend, negative = downtrend

    return {
      _id: emp._id,
      name: emp.name,
      email: emp.email,
      performanceScore: emp.performanceScore,
      totalPoints: emp.totalPoints,
      totalAttendance,
      trend,
      rank: idx + 1,
    };
  }));

  return { 
    totalEmployees, totalGroups, pendingApprovals, todayAttendances, 
    trackingEnabled,
    activeTrackingNow,
    missedActivityToday,
    topPerformers: enriched.slice(0, 3),
    leaderboard: enriched,
  };
};

export const getPendingApprovals = async () => {
  return await ApprovalRequest.find({ status: 'PENDING' }).populate('userId', 'name email');
};

export const processApproval = async (requestId, adminId, isApproved) => {
  const request = await ApprovalRequest.findById(requestId);
  if (!request) {
    throw new ApiError(404, 'Approval request not found');
  }
  if (request.status !== 'PENDING') {
    throw new ApiError(400, 'Request already processed');
  }

  const attendance = await Attendance.findById(request.attendanceId);

  const session = await ApprovalRequest.startSession();
  session.startTransaction();

  try {
    request.status = isApproved ? 'APPROVED' : 'REJECTED';
    request.reviewedBy = adminId;
    await request.save({ session });
    
    attendance.approvalStatus = isApproved ? 'APPROVED' : 'REJECTED';
    attendance.status = isApproved ? 'LATE_APPROVED' : 'LATE_REJECTED';
    
    const pointsPenalty = isApproved ? -15 : -25;
    attendance.pointsAwarded = pointsPenalty;
    await attendance.save({ session });

    await PerformanceLog.create([{
      userId: request.userId,
      points: pointsPenalty,
      reason: `Late check-in ${isApproved ? 'Approved' : 'Rejected'} by Admin`
    }], { session });

    await User.findByIdAndUpdate(request.userId, {
      $inc: { performanceScore: pointsPenalty }
    }, { session });

    await session.commitTransaction();
    session.endSession();

    return request;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const getUsers = async (query) => {
  const { page = 1, limit = 10, search = '' } = query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await User.find(filter)
    .populate('groupId', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalUsers = await User.countDocuments(filter);
  const totalPages = Math.ceil(totalUsers / limit);

  return {
    users,
    totalUsers,
    totalPages,
    currentPage: Number(page),
  };
};

export const deleteUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  
  // Optional: Prevent deleting the last admin or yourself
  // For now, just remove
  await User.findByIdAndDelete(userId);
  
  // Consider deleting related performance logs, attendance, etc.
  // We'll keep them for historical records or delete them if required.
  return user;
};

export const toggleUserStatus = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  user.isActive = !user.isActive;
  await user.save();
  return user;
};

import Feedback from '../models/Feedback.js';
import Notification from '../models/Notification.js';
import { sendEmail } from '../utils/mailer.js';

export const processFeedback = async (userId, adminId, { text, points, imageUrl }) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const feedback = await Feedback.create([{
      userId,
      adminId,
      text,
      imageUrl,
      pointsChanged: points
    }], { session });

    if (points !== 0) {
      await PerformanceLog.create([{
        userId,
        points,
        reason: `Admin Feedback: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`
      }], { session });

      await User.findByIdAndUpdate(userId, {
        $inc: { 
          performanceScore: points,
          totalPoints: points > 0 ? points : 0
        }
      }, { session });
    }

    const notification = await Notification.create([{
      userId,
      audience: 'EMPLOYEE',
      title: points !== 0 ? `Feedback Received (${points > 0 ? '+' : ''}${points} pts)` : 'Feedback Received',
      message: text,
      metadata: { feedbackId: feedback[0]._id, points }
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // Send email outside of transaction (best-effort)
    const emailHtml = `
      <h2>New Feedback from Admin</h2>
      <p><strong>Message:</strong> ${text}</p>
      ${points !== 0 ? `<p><strong>Points Adjustment:</strong> ${points > 0 ? '+' : ''}${points}</p>` : ''}
      <p>Log into your portal to see more details.</p>
      <br>
      <p>EMS System</p>
    `;
    await sendEmail({
      to: user.email,
      subject: 'New Feedback from Administrator',
      html: emailHtml
    });

    return {
      feedback: feedback[0],
      notification: notification[0]
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};
