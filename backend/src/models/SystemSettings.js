import mongoose from 'mongoose';

const systemSettingsSchema = new mongoose.Schema(
  {
    checkInTime: { type: String, default: '09:00' }, // HH:mm format
    checkOutTime: { type: String, default: '17:00' }, // HH:mm format
    earlyMargin: { type: Number, default: 5 }, // minutes
    lateMargin: { type: Number, default: 5 }, // minutes
    disableWeekends: { type: Boolean, default: true }, // auto mark weekends as holidays
    activitySessionMinutes: { type: Number, default: 0 }, // 0 = disabled
    activityGraceMinutes: { type: Number, default: 5 },
    activityMissPenaltyPoints: { type: Number, default: 8 },
    smtpUser: { type: String, default: '' },
    smtpPass: { type: String, default: '' },
    smtpHost: { type: String, default: 'smtp.gmail.com' },
    smtpPort: { type: Number, default: 465 },
    approvalNotificationEmail: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('SystemSettings', systemSettingsSchema);
