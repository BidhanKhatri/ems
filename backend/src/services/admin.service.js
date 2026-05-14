import mongoose from 'mongoose';
import Attendance from '../models/Attendance.js';
import ApprovalRequest from '../models/ApprovalRequest.js';
import User from '../models/User.js';
import Group from '../models/Group.js';
import PerformanceLog from '../models/PerformanceLog.js';
import ActivityLog from '../models/ActivityLog.js';
import SystemSettings from '../models/SystemSettings.js';
import ApiError from '../utils/ApiError.js';
import { getIO } from '../socket.js';
import { sendToUser } from './pushNotification.service.js';
import { getSettings } from './setting.service.js';
import { differenceInMinutes } from 'date-fns';

export const getDashboardStats = async () => {
  const totalEmployees = await User.countDocuments({ role: 'EMPLOYEE', approvalStatus: 'APPROVED' });
  const totalGroups = await Group.countDocuments();
  const pendingApprovals = await ApprovalRequest.countDocuments({ status: 'PENDING' });
  const pendingAccounts = await User.countDocuments({ role: 'EMPLOYEE', isVerified: true, approvalStatus: { $in: ['PENDING', null] } });
  const totalPending = pendingApprovals + pendingAccounts;
  
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

  const allEmployees = await User.find({ role: 'EMPLOYEE', approvalStatus: 'APPROVED' })
    .sort({ performanceScore: -1 })
    .select('name email performanceScore totalPoints groupId createdAt profilePicture');

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
      profilePicture: emp.profilePicture,
      rank: idx + 1,
    };
  }));

  return { 
    totalEmployees, totalGroups, 
    pendingApprovals: totalPending,
    pendingCheckins: pendingApprovals,
    pendingAccounts,
    todayAttendances, 
    trackingEnabled,
    activeTrackingNow,
    missedActivityToday,
    topPerformers: enriched.slice(0, 3),
    leaderboard: enriched,
  };
};

export const getPendingApprovals = async () => {
  return await ApprovalRequest.find({ status: 'PENDING' }).populate('userId', 'name email profilePicture');
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

    let pointsPenalty = 0;
    let penaltyReason = '';

    if (!isApproved) {
      // Rejected: fixed 10-point deduction
      pointsPenalty = -10;
      penaltyReason = 'Late check-in Rejected by Admin';
    } else {
      // Approved but still late: dynamic deduction based on lateness, max 5 points
      const settings = await getSettings();
      const NEPAL_TZ = 'Asia/Kathmandu';

      // Parse scheduled check-in time (HH:mm) into today's date
      const checkInDate = attendance.checkInTime; // actual Date object
      const [schH, schM] = settings.checkInTime.split(':').map(Number);

      // Build the scheduled check-in as a Date on the same day
      const scheduledCheckin = new Date(checkInDate);
      scheduledCheckin.setHours(schH, schM, 0, 0);

      const minutesLate = Math.max(0, differenceInMinutes(checkInDate, scheduledCheckin));

      // Cap the late window at lateMargin + 120 mins to keep formula sensible
      const maxLateWindow = (settings.lateMargin || 30) + 120;
      const ratio = Math.min(1, minutesLate / maxLateWindow);
      pointsPenalty = -Math.max(1, Math.round(5 * ratio));
      penaltyReason = `Late check-in Approved by Admin (${minutesLate} min late)`;
    }

    attendance.pointsAwarded = pointsPenalty;
    await attendance.save({ session });

    await PerformanceLog.create([{
      userId: request.userId,
      points: pointsPenalty,
      reason: penaltyReason
    }], { session });

    await User.findByIdAndUpdate(request.userId, {
      $inc: { performanceScore: pointsPenalty }
    }, { session });

    await session.commitTransaction();
    session.endSession();

    // Trigger real-time update
    getIO().emit('admin:dashboard-update');
    getIO().emit('leaderboard:update');

    sendToUser(
      request.userId,
      'Check-in Request Processed',
      `Your late check-in request was ${isApproved ? 'Approved' : 'Rejected'} by Admin.`,
      { type: 'CHECKIN_APPROVAL', status: isApproved ? 'APPROVED' : 'REJECTED' }
    ).catch(err => console.error('Push notification failed:', err));

    // Send Email to Employee
    const user = await User.findById(request.userId);
    if (user && user.email) {
      const subject = `Late Check-in Request ${isApproved ? 'Approved' : 'Rejected'} - Staffingbetit`;
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: ${isApproved ? '#059669' : '#dc2626'}; text-align: center;">Request ${isApproved ? 'Approved' : 'Rejected'}</h2>
          <p>Hello ${user.name},</p>
          <p>Your request for late check-in on <strong>${attendance.date}</strong> has been ${isApproved ? 'approved' : 'rejected'} by the administrator.</p>
          
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Status:</strong> ${isApproved ? 'Approved' : 'Rejected'}</p>
            <p style="margin: 5px 0;"><strong>Points Awarded:</strong> ${pointsPenalty}</p>
            <p style="margin: 5px 0;"><strong>Message:</strong> Your attendance record has been updated accordingly.</p>
          </div>
          
          <p>You can check your updated attendance status and performance score in your employee portal.</p>
          <br>
          <p>Staffingbetit Team</p>
        </div>
      `;
      sendEmail({ to: user.email, subject, html }).catch(err => {
        console.error('Failed to send approval email to employee:', err);
      });
    }

    // Notify employee via socket for real-time dashboard update
    try {
      getIO().to(request.userId.toString()).emit('attendance:update');
    } catch (socketErr) {
      console.warn('Socket emission failed in processApproval:', socketErr.message);
    }

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

  const filter = { role: 'EMPLOYEE', approvalStatus: 'APPROVED' };
  if (search) {
    filter.$and = [
      { role: 'EMPLOYEE', approvalStatus: 'APPROVED' },
      {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ]
      }
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
      metadata: { feedbackId: feedback[0]._id, points, imageUrl }
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // Trigger real-time dashboard updates
    getIO().emit('admin:dashboard-update');
    getIO().emit('leaderboard:update');

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
    
    sendToUser(
      userId,
      points !== 0 ? `Feedback Received (${points > 0 ? '+' : ''}${points} pts)` : 'Feedback Received',
      text,
      { type: 'FEEDBACK', feedbackId: feedback[0]._id.toString() },
      false // DON'T save to DB again, we already did it inside the transaction
    ).catch(err => console.error('Push notification failed:', err));

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

export const getAccountApprovals = async (query) => {
  const { page = 1, limit = 5, status = '', search = '' } = query;
  const skip = (page - 1) * limit;

  const filter = { role: 'EMPLOYEE', isVerified: true };
  if (status === 'PENDING') {
    filter.approvalStatus = { $in: ['PENDING', null] };
  } else if (status) {
    filter.approvalStatus = status;
  }

  if (search) {
    filter.email = { $regex: search, $options: 'i' };
  }

  const users = await User.find(filter)
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

export const updateAccountApprovalStatus = async (userId, status) => {
  if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
    throw new ApiError(400, 'Invalid status');
  }
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  user.approvalStatus = status;
  await user.save();

  // Trigger real-time update
  getIO().emit('admin:dashboard-update');
  getIO().emit('leaderboard:update');

  sendToUser(
    userId,
    'Account Status Updated',
    `Your account has been ${status.toLowerCase()} by an administrator.`
  ).catch(err => console.error('Push notification failed:', err));

  return user;
};
