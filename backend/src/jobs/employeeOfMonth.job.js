import cron from 'node-cron';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import SystemSettings from '../models/SystemSettings.js';
import Holiday from '../models/Holiday.js';
import { processOverdueActivitySessions } from '../services/activity.service.js';
import { subDays, startOfDay, endOfDay, isWeekend, addDays } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

const NEPAL_TZ = 'Asia/Kathmandu';
const initCronJobs = () => {
  // Run every minute for activity compliance monitoring
  cron.schedule('* * * * *', async () => {
    try {
      await processOverdueActivitySessions();
    } catch (error) {
      console.error('Failed to run activity monitor job', error);
    }
  }, { timezone: NEPAL_TZ });

  cron.schedule('5 0 * * *', async () => {
    try {
      const now = new Date();
      const nepalNow = toZonedTime(now, NEPAL_TZ);
      const yesterday = subDays(nepalNow, 1);
      const dateStr = formatInTimeZone(now, NEPAL_TZ, 'yyyy-MM-dd'); // This is actually 'today' string, wait
      // The missed job checks for 'yesterday'. 
      const yesterdayStr = formatInTimeZone(yesterday, NEPAL_TZ, 'yyyy-MM-dd');
      const settings = await SystemSettings.findOne();

      // 1. Skip if weekend disabled
      if (settings?.disableWeekends && isWeekend(yesterday)) return;

      // 2. Skip if holiday (using Nepal boundaries)
      const nepalStart = toZonedTime(`${yesterdayStr}T00:00:00`, NEPAL_TZ);
      const nepalEnd = toZonedTime(`${yesterdayStr}T23:59:59`, NEPAL_TZ);

      const isHoliday = await Holiday.findOne({
        startDate: { $lte: nepalEnd },
        endDate: { $gte: nepalStart }
      });
      if (isHoliday) return;

      // 3. Find all employees
      const employees = await User.find({ role: 'EMPLOYEE', isActive: true });

      for (const employee of employees) {
        // 4. Check if attendance exists
        const attendance = await Attendance.findOne({ userId: employee._id, date: yesterdayStr });

        if (!attendance) {
          // Create missed record
          await Attendance.create({
            userId: employee._id,
            date: yesterdayStr,
            checkInTime: nepalStart,
            checkOutTime: nepalEnd,
            status: 'MISSED',
            pointsAwarded: 0
          });
          console.log(`[Job] Marked MISSED for ${employee.name} on ${yesterdayStr}`);
        }
      }
    } catch (error) {
      console.error('Failed to run missed attendance job', error);
    }
  }, { timezone: NEPAL_TZ });

  cron.schedule('59 23 28-31 * *', async () => {
    // A trick to verify it's the actual last day of the month in Nepal
    const now = new Date();
    const nepalNow = toZonedTime(now, NEPAL_TZ);
    const tomorrow = addDays(nepalNow, 1);
    
    if (tomorrow.getDate() !== 1) return;

    try {
      console.log('Running Employee of the Month Job...');
      const topEmployee = await User.findOne({ role: 'EMPLOYEE', isActive: true })
        .sort({ performanceScore: -1 })
        .exec();

      if (topEmployee) {
        console.log(`Congratulations to ${topEmployee.name} (ID: ${topEmployee._id})! They are the Employee of the Month with ${topEmployee.performanceScore} points.`);
      }
    } catch (error) {
      console.error('Failed to run EOTM job', error);
    }
  }, { timezone: NEPAL_TZ });
};

export default initCronJobs;
