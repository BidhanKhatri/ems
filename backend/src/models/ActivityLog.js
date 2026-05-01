import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['MARKED_ACTIVE', 'MISSED'], required: true },
    timestamp: { type: Date, default: Date.now },
    dueAt: { type: Date, default: null },
    sessionMinutes: { type: Number, default: 0 },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    locationLabel: { type: String, default: '' },
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracy: { type: Number, default: null },
    },
    source: { type: String, enum: ['EMPLOYEE', 'SYSTEM'], default: 'EMPLOYEE' },
  },
  { timestamps: true }
);

export default mongoose.model('ActivityLog', activityLogSchema);
