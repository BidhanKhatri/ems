import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import ApprovalRequest from '../models/ApprovalRequest.js';
import PerformanceLog from '../models/PerformanceLog.js';
import ApiError from '../utils/ApiError.js';
import { sendEmail } from '../utils/mailer.js';
import { addMinutes, differenceInMinutes, format, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';

import { getTodayStatus, getSettings } from './setting.service.js';

const addPerformancePoints = async (userId, points, reason, session) => {
  await PerformanceLog.create([{ userId, points, reason }], { session });
  await User.findByIdAndUpdate(userId, { 
    $inc: { performanceScore: points, totalPoints: points > 0 ? points : 0 }
  }, { session });
};

const getScheduledDateTime = (baseDate, hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  let date = setHours(baseDate, h || 0);
  date = setMinutes(date, m || 0);
  date = setSeconds(date, 0);
  date = setMilliseconds(date, 0);
  return date;
};

export const checkIn = async (userId) => {
  const statusCheck = await getTodayStatus(userId);
  if (statusCheck.isHoliday) {
    throw new ApiError(400, `Cannot check in. Today is a holiday: ${statusCheck.message}`);
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  
  const existingAttendance = await Attendance.findOne({ userId, date: today });
  if (existingAttendance) {
    throw new ApiError(400, 'Already checked in today');
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  
  const settings = await getSettings();
  // settings.checkInTime is like "09:00"
  const [targetH, targetM] = settings.checkInTime.split(':').map(Number);
  const targetTimeInMinutes = targetH * 60 + targetM;

  const T_EARLY_LOWER = targetTimeInMinutes - settings.earlyMargin;
  const T_ON_TIME = targetTimeInMinutes;
  const T_LATE_BOUND = targetTimeInMinutes + settings.lateMargin;

  let status;
  let pointsAwarded = 0;
  let needsApproval = false;

  if (currentTimeInMinutes < T_EARLY_LOWER) {
    throw new ApiError(400, `Too early to check-in. Please wait until ${Math.floor(T_EARLY_LOWER / 60)}:${String(T_EARLY_LOWER % 60).padStart(2, '0')}.`);
  } else if (currentTimeInMinutes >= T_EARLY_LOWER && currentTimeInMinutes <= T_ON_TIME) {
    status = 'EARLY';
    pointsAwarded = 10;
  } else if (currentTimeInMinutes > T_ON_TIME && currentTimeInMinutes <= T_LATE_BOUND) {
    status = 'LATE';
    pointsAwarded = -5;
  } else {
    status = 'PENDING_APPROVAL';
    needsApproval = true;
  }

  const session = await Attendance.startSession();
  session.startTransaction();

  try {
    const attendance = await Attendance.create([{
      userId,
      date: today,
      checkInTime: now,
      status,
      pointsAwarded: needsApproval ? 0 : pointsAwarded,
      approvalStatus: needsApproval ? 'PENDING' : 'NONE'
    }], { session });

    if (!needsApproval && pointsAwarded !== 0) {
      await addPerformancePoints(userId, pointsAwarded, `Check-in status: ${status}`, session);
    }

    const nowDate = new Date();
    const shiftStart = getScheduledDateTime(nowDate, settings.checkInTime);
    const initialDue = nowDate < shiftStart ? shiftStart : addMinutes(nowDate, settings.activitySessionMinutes || 0);

    if ((settings.activitySessionMinutes || 0) > 0) {
      await User.findByIdAndUpdate(userId, {
        lastActivityMarkAt: nowDate,
        nextActivityDueAt: initialDue,
        lastActivityPromptAt: null,
      }, { session });
    } else {
      await User.findByIdAndUpdate(userId, {
        lastActivityMarkAt: null,
        nextActivityDueAt: null,
        lastActivityPromptAt: null,
      }, { session });
    }

    if (needsApproval) {
      const checkInTimeStr = format(now, 'hh:mm a');
      const delayMins = currentTimeInMinutes - targetTimeInMinutes;
      await ApprovalRequest.create([{
        userId,
        attendanceId: attendance[0]._id,
        reason: `Late check-in at ${checkInTimeStr}. Delayed by ${delayMins} minutes (Scheduled: ${settings.checkInTime}).`
      }], { session });

      // Send email notification to admin
      if (settings.approvalNotificationEmail) {
        const user = await User.findById(userId).session(session);
        const subject = `Approval Required: Late Check-In - ${user.name}`;
        const html = `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #d97706;">Late Check-In Approval Required</h2>
            <p>Hello Admin,</p>
            <p>An employee has checked in late and requires your approval:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px; border: 1px solid #eee; font-weight: bold; width: 140px;">Employee:</td>
                <td style="padding: 8px; border: 1px solid #eee;">${user.name} (${user.email})</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #eee; font-weight: bold;">Check-In Time:</td>
                <td style="padding: 8px; border: 1px solid #eee;">${checkInTimeStr}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #eee; font-weight: bold;">Lateness:</td>
                <td style="padding: 8px; border: 1px solid #eee; color: #b91c1c;">${delayMins} minutes late</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #eee; font-weight: bold;">Scheduled:</td>
                <td style="padding: 8px; border: 1px solid #eee;">${settings.checkInTime}</td>
              </tr>
            </table>
            <p>Please log in to the Admin Portal to review and approve/reject this request.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #666;">This is an automated notification from the EMS System.</p>
          </div>
        `;
        
        // We don't await the email send to avoid blocking the transaction/response, 
        // but we should catch errors. Actually, better to send after transaction commit
        // but for simplicity and immediate feedback we trigger it.
        // To be safe, we'll trigger it without blocking.
        sendEmail({ to: settings.approvalNotificationEmail, subject, html }).catch(err => {
          console.error('Failed to send approval notification email:', err);
        });
      }
    }

    await session.commitTransaction();
    session.endSession();

    return attendance[0];
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const checkOut = async (userId) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const attendance = await Attendance.findOne({ userId, date: today });
  
  if (!attendance) {
    throw new ApiError(400, 'Cannot check out without checking in');
  }
  
  if (attendance.checkOutTime) {
    throw new ApiError(400, 'Already checked out today');
  }

  const now = new Date();
  attendance.checkOutTime = now;

  const settings = await getSettings();
  const scheduledCheckout = getScheduledDateTime(now, settings.checkOutTime);
  let overtimeMinutes = 0;
  let overtimePoints = 0;

  if (now > scheduledCheckout) {
    overtimeMinutes = Math.max(0, differenceInMinutes(now, scheduledCheckout));
    // 1 point per 15 mins, capped at 16 points/day (4 hours)
    overtimePoints = Math.min(16, Math.floor(overtimeMinutes / 15));
  }

  attendance.overtimeMinutes = overtimeMinutes;
  attendance.overtimePoints = overtimePoints;
  await attendance.save();

  if (overtimePoints > 0) {
    await PerformanceLog.create({
      userId,
      points: overtimePoints,
      reason: `Overtime reward: ${overtimeMinutes} mins beyond scheduled checkout`,
    });
    await User.findByIdAndUpdate(userId, {
      $inc: { performanceScore: overtimePoints, totalPoints: overtimePoints },
    });
  }

  await User.findByIdAndUpdate(userId, {
    nextActivityDueAt: null,
    lastActivityPromptAt: null,
  });

  return attendance;
};

export const getMyAttendance = async (userId) => {
  return await Attendance.find({ userId }).sort({ date: -1 });
};

export const getMyPerformance = async (userId) => {
  return await PerformanceLog.find({ userId }).sort({ date: 1 }); // Ascending for time-series charts
};
