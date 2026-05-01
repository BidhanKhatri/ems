import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    startTime: {
      type: String, // HH:MM (24-hour format)
      required: true,
    },
    endTime: {
      type: String, // HH:MM (24-hour format)
      required: true,
    },
    title: {
      type: String,
      default: 'Regular Shift',
    },
    color: {
      type: String,
      default: '#3b82f6', // default blue color
    },
  },
  { timestamps: true }
);

export default mongoose.model('Schedule', scheduleSchema);
