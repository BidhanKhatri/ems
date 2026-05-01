import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['ADMIN', 'EMPLOYEE'], default: 'EMPLOYEE' },
    isVerified: { type: Boolean, default: false },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    performanceScore: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    otp: { type: String },
    otpExpiresAt: { type: Date },
    resetPasswordOtp: { type: String },
    resetPasswordOtpExpiresAt: { type: Date },
    lastActivityMarkAt: { type: Date, default: null },
    nextActivityDueAt: { type: Date, default: null },
    lastActivityPromptAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordMatch = async function (password) {
  return await bcrypt.compare(password, this.password);
};

export default mongoose.model('User', userSchema);
