import cron from 'node-cron';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import SystemSettings from '../models/SystemSettings.js';
import Holiday from '../models/Holiday.js';
import { processOverdueActivitySessions } from '../services/activity.service.js';
import { subDays, startOfDay, endOfDay, isWeekend } from 'date-fns';

// Run at 23:59 on the last day of the month
const initCronJobs = () => {
  // Run every minute for activity compliance monitoring
  cron.schedule('* * * * *', async () => {
    try {
      await processOverdueActivitySessions();
    } catch (error) {
      console.error('Failed to run activity monitor job', error);
    }
  });

  cron.schedule('5 0 * * *', async () => {
    try {
      const yesterday = subDays(new Date(), 1);
      const dateStr = yesterday.toISOString().split('T')[0];
      const settings = await SystemSettings.findOne();

      // 1. Skip if weekend disabled
      if (settings?.disableWeekends && isWeekend(yesterday)) return;

      // 2. Skip if holiday
      const isHoliday = await Holiday.findOne({
        startDate: { $lte: endOfDay(yesterday) },
        endDate: { $gte: startOfDay(yesterday) }
      });
      if (isHoliday) return;

      // 3. Find all employees
      const employees = await User.find({ role: 'EMPLOYEE', isActive: true });

      for (const employee of employees) {
        // 4. Check if attendance exists
        const attendance = await Attendance.findOne({ userId: employee._id, date: dateStr });

        if (!attendance) {
          // Create missed record
          await Attendance.create({
            userId: employee._id,
            date: dateStr,
            checkInTime: startOfDay(yesterday),
            checkOutTime: endOfDay(yesterday),
            status: 'MISSED',
            pointsAwarded: 0
          });
          console.log(`[Job] Marked MISSED for ${employee.name} on ${dateStr}`);
        }
      }
    } catch (error) {
      console.error('Failed to run missed attendance job', error);
    }
  });

  cron.schedule('59 23 28-31 * *', async () => {
    // A trick to verify it's the actual last day of the month
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (tomorrow.getDate() !== 1) return;

    try {
      console.log('Running Employee of the Month Job...');
      const topEmployee = await User.findOne({ role: 'EMPLOYEE', isActive: true })
        .sort({ performanceScore: -1 })
        .exec();

      if (topEmployee) {
        console.log(`Congratulations to ${topEmployee.name} (ID: ${topEmployee._id})! They are the Employee of the Month with ${topEmployee.performanceScore} points.`);
        // Note: Could also store this in a HallOfFame collection or reset scores here,
        // but user prompt only states "calculate Employee of the Month".
      }
    } catch (error) {
      console.error('Failed to run EOTM job', error);
    }
  });
};

export default initCronJobs;
