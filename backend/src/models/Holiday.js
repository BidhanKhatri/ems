import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Indexes to speed up range queries
holidaySchema.index({ startDate: 1, endDate: 1 });

export default mongoose.model('Holiday', holidaySchema);
