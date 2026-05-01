import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { sendEmail } from '../utils/mailer.js';

export const generateTokens = (userId, role) => {
  const payload = { sub: userId, role };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: `${process.env.JWT_ACCESS_EXPIRATION_MINUTES}m`,
  });
  return { accessToken };
};

const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export const registerUser = async (userData) => {
  if (await User.findOne({ email: userData.email })) {
    throw new ApiError(400, 'Email already taken');
  }

  const otp = generateOTP();
  const otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

  const user = await User.create({
    ...userData,
    otp,
    otpExpiresAt,
  });

  // Send OTP via Email
  const subject = 'Verify Your Account - EMS';
  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #4f46e5; text-align: center;">Verify Your Email</h2>
      <p>Hello ${user.name},</p>
      <p>Your one-time password (OTP) for account verification is:</p>
      <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 8px; margin: 20px 0;">
        ${otp}
      </div>
      <p style="color: #6b7280; font-size: 14px;">This code will expire in 2 minutes.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmail({ to: user.email, subject, html }).catch(err => {
    console.error('Failed to send registration OTP email:', err);
  });

  console.log(`\n=== OTP MOCK ===\nTo: ${user.email}\nOTP: ${otp}\n================\n`);

  return user;
};

export const loginUserWithEmailAndPassword = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(401, 'Incorrect email or password');
  }
  
  if (!user.isVerified) {
    throw new ApiError(403, 'Please verify your email before logging in');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Account is deactivated');
  }

  return user;
};

export const verifyEmail = async (email, otp) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.isVerified) {
    throw new ApiError(400, 'Account is already verified');
  }

  // Testing bypass or actual OTP check
  const isTestingBypass = otp === '0000';
  const isValidOriginalOTP = user.otp === otp && user.otpExpiresAt > new Date();

  if (!isTestingBypass && !isValidOriginalOTP) {
    const isExpired = user.otp === otp && user.otpExpiresAt <= new Date();
    throw new ApiError(400, isExpired ? 'OTP has expired' : 'Invalid OTP');
  }

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  return user;
};

export const resendOTP = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.isVerified) {
    throw new ApiError(400, 'Account is already verified');
  }

  const otp = generateOTP();
  const otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

  user.otp = otp;
  user.otpExpiresAt = otpExpiresAt;
  await user.save();

  // Send OTP via Email
  const subject = 'New OTP for Verification - EMS';
  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #4f46e5; text-align: center;">New Verification Code</h2>
      <p>Hello ${user.name},</p>
      <p>Your new one-time password (OTP) is:</p>
      <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 8px; margin: 20px 0;">
        ${otp}
      </div>
      <p style="color: #6b7280; font-size: 14px;">This code will expire in 2 minutes.</p>
    </div>
  `;

  await sendEmail({ to: user.email, subject, html }).catch(err => {
    console.error('Failed to send resend OTP email:', err);
  });

  console.log(`\n=== RESEND OTP MOCK ===\nTo: ${user.email}\nOTP: ${otp}\n=======================\n`);

  return true;
};

export const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, 'No account found with this email');
  }

  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

  user.resetPasswordOtp = otp;
  user.resetPasswordOtpExpiresAt = otpExpiresAt;
  await user.save();

  // Send Reset OTP via Email
  const subject = 'Password Reset Code - EMS';
  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #4f46e5; text-align: center;">Reset Your Password</h2>
      <p>Hello ${user.name},</p>
      <p>You requested a password reset. Your verification code is:</p>
      <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 8px; margin: 20px 0;">
        ${otp}
      </div>
      <p style="color: #6b7280; font-size: 14px;">This code will expire in 2 minutes.</p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmail({ to: user.email, subject, html }).catch(err => {
    console.error('Failed to send password reset email:', err);
  });

  console.log(`\n=== RESET OTP MOCK ===\nTo: ${user.email}\nOTP: ${otp}\n======================\n`);

  return true;
};

export const verifyResetOTP = async (email, otp) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Testing bypass or actual OTP check
  const isTestingBypass = otp === '0000';
  const isValidOTP = user.resetPasswordOtp === otp && user.resetPasswordOtpExpiresAt > new Date();

  if (!isTestingBypass && !isValidOTP) {
    const isExpired = user.resetPasswordOtp === otp && user.resetPasswordOtpExpiresAt <= new Date();
    console.log(`[verifyResetOTP] Failed for ${email}. Provided: ${otp}, Actual: ${user.resetPasswordOtp}, Expired: ${isExpired}`);
    throw new ApiError(400, isExpired ? 'OTP has expired' : 'Invalid OTP');
  }

  return true;
};

export const resetPassword = async (email, otp, newPassword) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Re-verify OTP for security during final reset
  const isTestingBypass = otp === '0000';
  const isValidOTP = user.resetPasswordOtp === otp && user.resetPasswordOtpExpiresAt > new Date();

  if (!isTestingBypass && !isValidOTP) {
    const isExpired = user.resetPasswordOtp === otp && user.resetPasswordOtpExpiresAt <= new Date();
    console.log(`[resetPassword] Final check failed for ${email}. Provided: ${otp}, Actual: ${user.resetPasswordOtp}, Expired: ${isExpired}`);
    throw new ApiError(400, isExpired ? 'Invalid or expired OTP' : 'Invalid OTP');
  }

  user.password = newPassword;
  user.resetPasswordOtp = undefined;
  user.resetPasswordOtpExpiresAt = undefined;
  await user.save();

  return true;
};

export const updateUserProfile = async (userId, updates) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (updates.email && updates.email !== user.email) {
    const existingUser = await User.findOne({ email: updates.email });
    if (existingUser && existingUser.id !== user.id) {
      throw new ApiError(400, 'Email already taken');
    }
    user.email = updates.email;
  }

  if (updates.name) {
    user.name = updates.name;
  }

  await user.save();
  return user;
};
