import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    imageUrl: { type: String, default: null },
    pointsChanged: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Feedback', feedbackSchema);
