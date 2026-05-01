import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    checkInTime: { type: Date, required: true },
    checkOutTime: { type: Date },
    status: { 
      type: String, 
      enum: ['EARLY', 'LATE', 'ON_TIME', 'PENDING_APPROVAL', 'LATE_APPROVED', 'LATE_REJECTED'], 
      required: true 
    },
    pointsAwarded: { type: Number, default: 0 },
    approvalStatus: { 
      type: String, 
      enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'], 
      default: 'NONE' 
    },
    overtimeMinutes: { type: Number, default: 0 },
    overtimePoints: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Attendance', attendanceSchema);
