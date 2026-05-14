import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import ApprovalRequest from '../models/ApprovalRequest.js';
import PerformanceLog from '../models/PerformanceLog.js';
import ApiError from '../utils/ApiError.js';
import { sendEmail } from '../utils/mailer.js';
import { sendToAdmins } from './pushNotification.service.js';
import { getIO } from '../socket.js';
import { addMinutes, differenceInMinutes, format, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

import { getTodayStatus, getSettings } from './setting.service.js';

const NEPAL_TZ = 'Asia/Kathmandu';

const addPerformancePoints = async (userId, points, reason, session) => {
  await PerformanceLog.create([{ userId, points, reason }], { session });
  await User.findByIdAndUpdate(userId, { 
    $inc: { performanceScore: points, totalPoints: points > 0 ? points : 0 }
  }, { session });
};

const getScheduledDateTime = (baseDate, hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  // We use formatInTimeZone to get the baseDate parts in Nepal, then rebuild
  const nepalDateStr = formatInTimeZone(baseDate, NEPAL_TZ, 'yyyy-MM-dd');
  const [y, mon, d] = nepalDateStr.split('-').map(Number);
  
  // Construct a date that represents that YYYY-MM-DD HH:mm:00 in Nepal timezone
  // This is a bit tricky with standard Date objects which are local.
  // However, for comparison purposes later in the code, we just need the relative offsets.
  // Actually, a better way is to use the current implementation but ensure baseDate is zoned.
  
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

  const now = new Date();
  const today = formatInTimeZone(now, NEPAL_TZ, 'yyyy-MM-dd');
  
  const existingAttendance = await Attendance.findOne({ userId, date: today });
  if (existingAttendance) {
    throw new ApiError(400, 'Already checked in today');
  }

  const currentHour = parseInt(formatInTimeZone(now, NEPAL_TZ, 'H'));
  const currentMinute = parseInt(formatInTimeZone(now, NEPAL_TZ, 'm'));
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
    const waitH = Math.floor(T_EARLY_LOWER / 60);
    const waitM = String(T_EARLY_LOWER % 60).padStart(2, '0');
    const ampm = waitH >= 12 ? 'PM' : 'AM';
    const hour12 = waitH % 12 || 12;
    throw new ApiError(400, `Too early to check-in. Please wait until ${hour12}:${waitM} ${ampm}.`);
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
      const checkInTimeStr = formatInTimeZone(now, NEPAL_TZ, 'hh:mm a');
      const delayMins = currentTimeInMinutes - targetTimeInMinutes;

      // Fetch user once here so it's available for both email and push notification
      const user = await User.findById(userId).session(session);
      
      const formatLateness = (mins) => {
        if (mins < 60) return `${mins} min`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h} hrs ${m} min`;
      };

      const formatToAMPM = (time24) => {
        if (!time24) return time24;
        const [h, m] = time24.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${m} ${ampm}`;
      };

      const latenessStr = formatLateness(delayMins);
      const scheduledTimeStr = formatToAMPM(settings.checkInTime);

      await ApprovalRequest.create([{
        userId,
        attendanceId: attendance[0]._id,
        reason: `Late check-in at ${checkInTimeStr}. Delayed by ${latenessStr} (Scheduled: ${scheduledTimeStr}).`
      }], { session });

      // Send email notification to admin
      if (settings.approvalNotificationEmail) {
        const subject = `Approval Required: Late Check-In - ${user.name}`;
        const html = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #fef3c7; padding: 24px; text-align: center; border-bottom: 1px solid #fde68a;">
              <h2 style="color: #92400e; margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Late Check-In Request</h2>
            </div>
            <div style="padding: 32px; background-color: #ffffff;">
              <p style="margin-top: 0; font-size: 16px;">Hello <strong>Admin</strong>,</p>
              <p style="color: #4b5563; font-size: 14px;">An employee has registered a late check-in and requires your administrative review.</p>
              
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #f3f4f6;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 12px; font-weight: bold; text-transform: uppercase; width: 120px;">Employee</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${user.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 12px; font-weight: bold; text-transform: uppercase;">Check-In Time</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${checkInTimeStr}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 12px; font-weight: bold; text-transform: uppercase;">Lateness</td>
                    <td style="padding: 8px 0; color: #b91c1c; font-size: 14px; font-weight: 800;">${latenessStr} delayed</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 12px; font-weight: bold; text-transform: uppercase;">Scheduled</td>
                    <td style="padding: 8px 0; color: #4b5563; font-size: 14px; font-weight: 500;">${scheduledTimeStr}</td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center; margin-top: 32px;">
                <a href="https://staffingbetit.com/admin/approvals" style="background-color: #92400e; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">Review Approval Request</a>
              </div>
              
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">
                This is an automated notification from Staffingbetit.
              </p>
            </div>
          </div>
        `;
        
        sendEmail({ to: settings.approvalNotificationEmail, subject, html }).catch(err => {
          console.error('Failed to send approval notification email:', err);
        });
      }
      
      // Always send socket/push notification to admins regardless of email setting
      sendToAdmins(
        'Late Check-In Request', 
        `${user.name} requires approval for late check-in at ${checkInTimeStr}.`,
        { type: 'APPROVAL_REQUEST', userId: user._id.toString() }
      ).catch(err => console.error('Push notification failed:', err));
    } else {
      // Normal check in notification
      const user = await User.findById(userId).session(session);
      const checkInTimeStr = formatInTimeZone(now, NEPAL_TZ, 'hh:mm a');
      sendToAdmins(
        'Employee Checked In', 
        `${user.name} checked in at ${checkInTimeStr}.`,
        { type: 'ATTENDANCE_CHECKIN', userId: user._id.toString() }
      ).catch(err => console.error('Push notification failed:', err));
    }

    await session.commitTransaction();
    session.endSession();

    // Notify admins of dashboard update
    getIO().emit('admin:dashboard-update', { userId });
    getIO().emit('leaderboard:update');

    return attendance[0];
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const checkOut = async (userId) => {
  const session = await Attendance.startSession();
  session.startTransaction();

  try {
    const now = new Date();
    const today = formatInTimeZone(now, NEPAL_TZ, 'yyyy-MM-dd');
    const attendance = await Attendance.findOne({ userId, date: today }).session(session);
    
    if (!attendance) {
      throw new ApiError(400, 'Cannot check out without checking in');
    }
    
    if (attendance.checkOutTime) {
      throw new ApiError(400, 'Already checked out today');
    }

    attendance.checkOutTime = now;
    const checkOutTimeStr = formatInTimeZone(now, NEPAL_TZ, 'hh:mm a');

    const user = await User.findById(userId).session(session);

    const settings = await getSettings();
    const scheduledCheckout = getScheduledDateTime(now, settings.checkOutTime);
    let overtimeMinutes = 0;
    let overtimePoints = 0;
    let earlyPenalty = 0;

    if (now > scheduledCheckout) {
      overtimeMinutes = Math.max(0, differenceInMinutes(now, scheduledCheckout));
      // 1 point per 15 mins, capped at 16 points/day (4 hours)
      overtimePoints = Math.min(16, Math.floor(overtimeMinutes / 15));
      
      attendance.overtimeMinutes = overtimeMinutes;
      attendance.overtimePoints = overtimePoints;
      
      if (overtimePoints > 0) {
        await addPerformancePoints(userId, overtimePoints, `Overtime reward: ${overtimeMinutes} mins beyond scheduled checkout`, session);
      }
    } else if (now < scheduledCheckout) {
      // Use Nepal-timezone-aware minute components for consistent dynamic calculation
      const currentHour = parseInt(formatInTimeZone(now, NEPAL_TZ, 'H'));
      const currentMinute = parseInt(formatInTimeZone(now, NEPAL_TZ, 'm'));
      const currentMins = currentHour * 60 + currentMinute;

      const [outH, outM] = settings.checkOutTime.split(':').map(Number);
      const targetMins = outH * 60 + outM;

      const [inH, inM] = settings.checkInTime.split(':').map(Number);
      const startMins = inH * 60 + inM;

      const totalShiftMinutes = Math.max(1, targetMins - startMins);
      const remainingMinutes = Math.max(0, targetMins - currentMins);
      
      // Dynamic deduction: max 5 points, proportional to remaining time
      earlyPenalty = Math.round(5 * (remainingMinutes / totalShiftMinutes));
      
      // Safety cap: ensure penalty does not exceed 5 points
      const originalPenalty = earlyPenalty;
      earlyPenalty = Math.min(5, Math.max(0, earlyPenalty));

      if (originalPenalty !== earlyPenalty || originalPenalty > 0) {
        console.log(`[Checkout Debug] User: ${userId}, Date: ${today}, NepalCurrentMins: ${currentMins}, TargetMins: ${targetMins}, ShiftMins: ${totalShiftMinutes}, RemainingMins: ${remainingMinutes}, CalcPenalty: ${originalPenalty}, FinalPenalty: ${earlyPenalty}`);
      }
      
      if (earlyPenalty > 0) {
        attendance.pointsAwarded -= earlyPenalty;
        await addPerformancePoints(userId, -earlyPenalty, `Early check-out penalty: ${remainingMinutes} mins before scheduled time`, session);
      }
    }

    await attendance.save({ session });

    await User.findByIdAndUpdate(userId, {
      nextActivityDueAt: null,
      lastActivityPromptAt: null,
    }, { session });

    await session.commitTransaction();
    session.endSession();

    // Post-transaction notifications
    sendToAdmins(
      'Employee Checked Out', 
      `${user.name} checked out at ${checkOutTimeStr}.`,
      { type: 'ATTENDANCE_CHECKOUT', userId: user._id.toString() }
    ).catch(err => console.error('Push notification failed:', err));

    // Notify admins and leaderboard of dashboard update
    getIO().emit('admin:dashboard-update', { userId });
    getIO().emit('leaderboard:update');
    getIO().to(userId.toString()).emit('attendance:update');

    return attendance;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const getMyAttendance = async (userId) => {
  return await Attendance.find({ userId }).sort({ date: -1 });
};

export const getMyPerformance = async (userId) => {
  return await PerformanceLog.find({ userId }).sort({ date: 1 }); // Ascending for time-series charts
};
