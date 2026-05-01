import SystemSettings from '../models/SystemSettings.js';
import Holiday from '../models/Holiday.js';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { addMinutes, startOfDay, endOfDay, isWeekend, parseISO, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';

const getScheduledDateTime = (baseDate, hhmm) => {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  let date = setHours(baseDate, h || 0);
  date = setMinutes(date, m || 0);
  date = setSeconds(date, 0);
  date = setMilliseconds(date, 0);
  return date;
};

export const getSettings = async () => {
  let settings = await SystemSettings.findOne();
  if (!settings) {
    settings = await SystemSettings.create({});
  }
  return settings;
};

export const updateSettings = async (data) => {
  const now = new Date();
  const sanitizedData = { ...data };
  if (Object.hasOwn(sanitizedData, 'activitySessionMinutes')) {
    sanitizedData.activitySessionMinutes = Math.max(0, Number(sanitizedData.activitySessionMinutes) || 0);
  }
  if (Object.hasOwn(sanitizedData, 'activityGraceMinutes')) {
    sanitizedData.activityGraceMinutes = Math.max(0, Number(sanitizedData.activityGraceMinutes) || 0);
  }
  if (Object.hasOwn(sanitizedData, 'activityMissPenaltyPoints')) {
    sanitizedData.activityMissPenaltyPoints = Math.max(1, Number(sanitizedData.activityMissPenaltyPoints) || 1);
  }

  let settings = await SystemSettings.findOne();
  if (!settings) {
    settings = new SystemSettings(sanitizedData);
  } else {
    Object.assign(settings, sanitizedData);
  }
  await settings.save();

  if ((settings.activitySessionMinutes || 0) <= 0) {
    await User.updateMany(
      { role: 'EMPLOYEE' },
      { $set: { nextActivityDueAt: null, lastActivityPromptAt: null } }
    );
  } else {
    const today = now.toISOString().split('T')[0];
    const activeAttendances = await Attendance.find({ date: today, checkOutTime: null }).select('userId');
    const userIds = activeAttendances.map((a) => a.userId);
    if (userIds.length) {
      const shiftStart = getScheduledDateTime(now, settings.checkInTime);
      const nextDue = now < shiftStart
        ? shiftStart
        : addMinutes(now, settings.activitySessionMinutes);

      await User.updateMany(
        { _id: { $in: userIds }, nextActivityDueAt: null },
        {
          $set: {
            lastActivityMarkAt: now,
            nextActivityDueAt: nextDue,
            lastActivityPromptAt: null,
          },
        }
      );
    }
  }

  return settings;
};

export const getHolidays = async () => {
  return await Holiday.find().sort({ startDate: 1 });
};

export const createHoliday = async (title, startDateStr, endDateStr, adminId) => {
  const startDate = startOfDay(parseISO(startDateStr));
  const endDate = endOfDay(parseISO(endDateStr));

  if (startDate > endDate) {
    throw new ApiError(400, 'Start date must be before end date');
  }

  const holiday = await Holiday.create({
    title,
    startDate,
    endDate,
    createdBy: adminId
  });

  // Retroactive cleanup: removing attendances that fall in this new holiday.
  // We match by `checkInTime` existing within the boundary.
  await Attendance.deleteMany({
    checkInTime: {
      $gte: startDate,
      $lte: endDate
    }
  });

  return holiday;
};

export const deleteHoliday = async (id) => {
  await Holiday.findByIdAndDelete(id);
  return true;
};

// Expose a public/employee endpoint helper to check current status quickly
export const getTodayStatus = async (userId) => {
  const now = new Date();
  const settings = await getSettings();

  if (settings.disableWeekends && isWeekend(now)) {
    return { isHoliday: true, message: 'Today is a Weekend', checkedIn: false };
  }

  const activeHoliday = await Holiday.findOne({
    startDate: { $lte: endOfDay(now) },
    endDate: { $gte: startOfDay(now) }
  });

  if (activeHoliday) {
    return { isHoliday: true, message: activeHoliday.title, checkedIn: false };
  }

  // Also check if employee is checked in already if not a holiday
  const todayString = now.toISOString().split('T')[0];
  const attendance = await Attendance.findOne({ userId, date: todayString });

  return { isHoliday: false, checkedIn: !!attendance };
};
