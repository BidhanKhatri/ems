import { addMinutes, format, isWeekend, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
import ActivityLog from '../models/ActivityLog.js';
import Attendance from '../models/Attendance.js';
import Holiday from '../models/Holiday.js';
import Notification from '../models/Notification.js';
import PerformanceLog from '../models/PerformanceLog.js';
import SystemSettings from '../models/SystemSettings.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

const createNotification = async ({ userId = null, audience, title, message, metadata = {} }) => {
  await Notification.create({ userId, audience, title, message, metadata });
};

const getScheduledDateTime = (baseDate, hhmm) => {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  let date = setHours(baseDate, h || 0);
  date = setMinutes(date, m || 0);
  date = setSeconds(date, 0);
  date = setMilliseconds(date, 0);
  return date;
};

const isHolidayOrWeekend = async (date, disableWeekends) => {
  if (disableWeekends && isWeekend(date)) return true;
  const holiday = await Holiday.findOne({
    startDate: { $lte: date },
    endDate: { $gte: date },
  }).select('_id');
  return !!holiday;
};

export const getEmployeeActivityStatus = async (userId) => {
  const settings = await SystemSettings.findOne();
  if (!settings || !settings.activitySessionMinutes || settings.activitySessionMinutes <= 0) {
    return { enabled: false };
  }

  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  const attendance = await Attendance.findOne({ userId, date: today });
  if (!attendance || attendance.checkOutTime) {
    return { enabled: true, requiresAction: false, message: 'Activity tracking starts after check-in.' };
  }

  const shiftStart = getScheduledDateTime(now, settings.checkInTime);
  const shiftEnd = getScheduledDateTime(now, settings.checkOutTime);
  const isOvertime = now > shiftEnd;
  const effectiveSessionMinutes = isOvertime
    ? Math.max(5, settings.activitySessionMinutes)
    : settings.activitySessionMinutes;

  if (now < shiftStart) {
    await User.findByIdAndUpdate(userId, {
      nextActivityDueAt: shiftStart,
      lastActivityPromptAt: null,
    });
    return {
      enabled: true,
      requiresAction: false,
      nextDueAt: shiftStart,
      sessionMinutes: settings.activitySessionMinutes,
      trackingPhase: 'BEFORE_SHIFT',
    };
  }

  const user = await User.findById(userId).select('nextActivityDueAt lastActivityMarkAt lastActivityPromptAt');
  if (!user?.nextActivityDueAt) {
    const nextDue = addMinutes(now, effectiveSessionMinutes);
    await User.findByIdAndUpdate(userId, { nextActivityDueAt: nextDue, lastActivityMarkAt: now });
    return {
      enabled: true,
      requiresAction: false,
      nextDueAt: nextDue,
      sessionMinutes: effectiveSessionMinutes,
      trackingPhase: isOvertime ? 'OVERTIME' : 'REGULAR',
    };
  }

  const requiresAction = now >= user.nextActivityDueAt;
  if (requiresAction && (!user.lastActivityPromptAt || user.lastActivityPromptAt < user.nextActivityDueAt)) {
    await Notification.create({
      userId,
      audience: 'EMPLOYEE',
      title: 'Activity Confirmation Needed',
      message: 'Please mark yourself active to confirm your current session.',
      metadata: { dueAt: user.nextActivityDueAt },
    });
    await User.findByIdAndUpdate(userId, { lastActivityPromptAt: now });
  }

  return {
    enabled: true,
    requiresAction,
    nextDueAt: user.nextActivityDueAt,
    sessionMinutes: effectiveSessionMinutes,
    graceMinutes: settings.activityGraceMinutes,
    lastMarkedAt: user.lastActivityMarkAt,
    trackingPhase: isOvertime ? 'OVERTIME' : 'REGULAR',
  };
};

export const markEmployeeActive = async (user, payload, req) => {
  const settings = await SystemSettings.findOne();
  if (!settings || !settings.activitySessionMinutes || settings.activitySessionMinutes <= 0) {
    throw new ApiError(400, 'Activity tracking is currently disabled by admin.');
  }

  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  const attendance = await Attendance.findOne({ userId: user.id, date: today });
  if (!attendance || attendance.checkOutTime) {
    throw new ApiError(400, 'You can only mark active during an active work session.');
  }

  const shiftEnd = getScheduledDateTime(now, settings.checkOutTime);
  const isOvertime = now > shiftEnd;
  const effectiveSessionMinutes = isOvertime
    ? Math.max(5, settings.activitySessionMinutes)
    : settings.activitySessionMinutes;
  const nextDueAt = addMinutes(now, effectiveSessionMinutes);
  const ipAddress = getClientIp(req);
  const location = payload?.location && typeof payload.location === 'object' ? payload.location : {};

  await ActivityLog.create({
    userId: user.id,
    type: 'MARKED_ACTIVE',
    timestamp: now,
    dueAt: user.nextActivityDueAt || null,
    sessionMinutes: effectiveSessionMinutes,
    ipAddress,
    userAgent: req.headers['user-agent'] || '',
    locationLabel: payload?.locationLabel || '',
    location: {
      latitude: typeof location.latitude === 'number' ? location.latitude : null,
      longitude: typeof location.longitude === 'number' ? location.longitude : null,
      accuracy: typeof location.accuracy === 'number' ? location.accuracy : null,
    },
    source: 'EMPLOYEE',
  });

  await User.findByIdAndUpdate(user.id, {
    lastActivityMarkAt: now,
    nextActivityDueAt,
    lastActivityPromptAt: null,
  });

  return {
    message: 'You are marked as active.',
    nextDueAt,
  };
};

export const getMyNotifications = async (user, sort = 'latest') => {
  const query = user.role === 'ADMIN'
    ? { audience: 'ADMIN' }
    : {
        $or: [
          { userId: user.id },
          { audience: 'EMPLOYEE', userId: null },
        ],
      };

  const sortOrder = sort === 'oldest' ? 1 : -1;
  return Notification.find(query).sort({ createdAt: sortOrder }).limit(100);
};

export const getUnreadNotificationsCount = async (user) => {
  const query = user.role === 'ADMIN'
    ? { audience: 'ADMIN', isRead: false }
    : {
        isRead: false,
        $or: [
          { userId: user.id },
          { audience: 'EMPLOYEE', userId: null },
        ],
      };

  return Notification.countDocuments(query);
};

export const markNotificationRead = async (user, notificationId) => {
  const notification = await Notification.findById(notificationId);
  if (!notification) throw new ApiError(404, 'Notification not found');

  const isAdminAllowed = user.role === 'ADMIN' && notification.audience === 'ADMIN';
  const isEmployeeAllowed =
    notification.audience === 'EMPLOYEE' &&
    (String(notification.userId) === String(user.id) || notification.userId === null);

  if (!isAdminAllowed && !isEmployeeAllowed) {
    throw new ApiError(403, 'Not allowed to update this notification');
  }

  notification.isRead = true;
  await notification.save();
  return notification;
};

export const getAdminActivityFeed = async ({
  page = 1,
  limit = 20,
  search = '',
  event = 'ALL',
  from = '',
  to = '',
} = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(5, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;

  let userFilter = {};
  if (search?.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    const matchedUsers = await User.find({
      role: 'EMPLOYEE',
      $or: [{ name: regex }, { email: regex }],
    }).select('_id');
    userFilter = { userId: { $in: matchedUsers.map((u) => u._id) } };
  }

  const activityFilter = { ...userFilter };

  if (event === 'MISSED' || event === 'MARKED_ACTIVE') {
    activityFilter.type = event;
  }

  if (from || to) {
    activityFilter.timestamp = {};
    if (from) {
      const parsedFrom = new Date(from);
      if (!Number.isNaN(parsedFrom.getTime())) {
        activityFilter.timestamp.$gte = parsedFrom;
      }
    }
    if (to) {
      const parsedTo = new Date(to);
      if (!Number.isNaN(parsedTo.getTime())) {
        activityFilter.timestamp.$lte = parsedTo;
      }
    }
    if (!activityFilter.timestamp.$gte && !activityFilter.timestamp.$lte) {
      delete activityFilter.timestamp;
    }
  }

  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const settings = await SystemSettings.findOne().lean();

  const [rows, total, missedToday, recentNotifications, activeTrackingNow] = await Promise.all([
    ActivityLog.find(activityFilter)
      .select('userId type timestamp ipAddress locationLabel dueAt')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate('userId', 'name email')
      .lean(),
    ActivityLog.countDocuments(activityFilter),
    ActivityLog.countDocuments({
      type: 'MISSED',
      timestamp: { $gte: today },
    }),
    Notification.find({ audience: 'ADMIN' })
      .select('title message createdAt')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    settings?.activitySessionMinutes > 0
      ? Attendance.countDocuments({ date: format(new Date(), 'yyyy-MM-dd'), checkOutTime: null })
      : Promise.resolve(0),
  ]);

  return {
    rows,
    page: safePage,
    limit: safeLimit,
    total,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    summary: {
      trackingEnabled: (settings?.activitySessionMinutes || 0) > 0,
      sessionMinutes: settings?.activitySessionMinutes || 0,
      activeTrackingNow,
      missedToday,
    },
    recentNotifications,
  };
};

export const processOverdueActivitySessions = async () => {
  const settings = await SystemSettings.findOne();
  if (!settings || !settings.activitySessionMinutes || settings.activitySessionMinutes <= 0) return;

  const now = new Date();
  if (await isHolidayOrWeekend(now, settings.disableWeekends)) return;

  const today = format(now, 'yyyy-MM-dd');
  const activeAttendances = await Attendance.find({ date: today, checkOutTime: null }).select('userId');
  if (!activeAttendances.length) return;

  const activeUserIds = activeAttendances.map((a) => a.userId);
  const shiftStart = getScheduledDateTime(now, settings.checkInTime);
  if (now < shiftStart) return;

  const shiftEnd = getScheduledDateTime(now, settings.checkOutTime);
  const effectiveSessionMinutes = now > shiftEnd
    ? Math.max(5, settings.activitySessionMinutes)
    : settings.activitySessionMinutes;

  await User.updateMany(
    {
      _id: { $in: activeUserIds },
      role: 'EMPLOYEE',
      isActive: true,
      $or: [{ nextActivityDueAt: null }, { nextActivityDueAt: { $exists: false } }],
    },
    {
      $set: {
        nextActivityDueAt: addMinutes(now, effectiveSessionMinutes),
        lastActivityPromptAt: null,
      },
    }
  );

  const overdueThreshold = addMinutes(now, -(settings.activityGraceMinutes || 0));
  const overdueUsers = await User.find({
    _id: { $in: activeUserIds },
    role: 'EMPLOYEE',
    isActive: true,
    nextActivityDueAt: { $lte: overdueThreshold },
  }).select('name email nextActivityDueAt');

  const penaltyMagnitude = Math.abs(settings.activityMissPenaltyPoints || 8);
  if (!overdueUsers.length) return;

  for (const employee of overdueUsers) {
    const nextDueAt = addMinutes(now, effectiveSessionMinutes);
    const penalty = -penaltyMagnitude;
    const reason = `Missed activity confirmation window (${effectiveSessionMinutes} mins session)`;

    await ActivityLog.create({
      userId: employee.id,
      type: 'MISSED',
      timestamp: now,
      dueAt: employee.nextActivityDueAt,
      sessionMinutes: effectiveSessionMinutes,
      source: 'SYSTEM',
    });

    await PerformanceLog.create({
      userId: employee.id,
      points: penalty,
      reason,
    });

    await User.findByIdAndUpdate(employee.id, {
      $inc: { performanceScore: penalty },
      nextActivityDueAt: nextDueAt,
    });

    await createNotification({
      userId: employee.id,
      audience: 'EMPLOYEE',
      title: 'Activity Check Missed',
      message: `You missed your activity confirmation and ${penaltyMagnitude} points were deducted.`,
      metadata: { dueAt: employee.nextActivityDueAt, penalty },
    });

    const adminMessage = `${employee.name} (${employee.email}) missed activity check due at ${employee.nextActivityDueAt?.toISOString() || 'N/A'}.`;
    await createNotification({
      audience: 'ADMIN',
      title: 'Employee Missed Activity Check',
      message: adminMessage,
      metadata: { employeeId: employee.id, penalty, dueAt: employee.nextActivityDueAt },
    });

    // WhatsApp alerts intentionally disabled for now to keep production flow stable.
  }
};
