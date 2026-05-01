import cron from 'node-cron';
import User from '../models/User.js';
import { processOverdueActivitySessions } from '../services/activity.service.js';

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
