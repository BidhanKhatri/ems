import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import SystemSettings from '../models/SystemSettings.js';
import ApiError from '../utils/ApiError.js';
import { sendEmail } from '../utils/mailer.js';
import * as pushService from './pushNotification.service.js';
import { getIO } from '../socket.js';

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
  const subject = 'Verify Your Account - Staffingbetit';
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
    await resendOTP(user.email);
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

  // Notify admins about new user awaiting approval
  if (user.role === 'EMPLOYEE') {
    const title = 'New Account Approval Needed';
    const body = `${user.name} has verified their email and is waiting for account approval.`;
    const metadata = {
      type: 'APPROVAL_REQUEST',
      userId: user._id.toString(),
      email: user.email
    };

    // This handles in-app DB notification, Socket emission, and Firebase Push
    pushService.sendToAdmins(title, body, metadata).catch(err => {
      console.error('Failed to notify admins of new registration:', err.message);
    });

    // Send Email Notification to Admin if configured
    SystemSettings.findOne().then(settings => {
      if (settings?.approvalNotificationEmail) {
        const subject = `New Registration: Account Approval Required - ${user.name}`;
        const html = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #4f46e5; padding: 24px; text-align: center;">
              <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">New Account Approval</h2>
            </div>
            <div style="padding: 32px; background-color: #ffffff;">
              <p style="margin-top: 0; font-size: 16px;">Hello <strong>Admin</strong>,</p>
              <p style="color: #4b5563; font-size: 14px;">A new employee has completed verification and is waiting for your approval to access the portal.</p>
              
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #f3f4f6;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 12px; font-weight: bold; text-transform: uppercase; width: 120px;">Employee</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${user.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 12px; font-weight: bold; text-transform: uppercase;">Email</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${user.email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 12px; font-weight: bold; text-transform: uppercase;">Status</td>
                    <td style="padding: 8px 0; color: #4f46e5; font-size: 14px; font-weight: 800;">PENDING APPROVAL</td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center; margin-top: 32px;">
                <a href="https://staffingbetit.com/admin/approvals?tab=accounts" style="background-color: #4f46e5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">Review Registration</a>
              </div>
              
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">
                This is an automated notification from Staffingbetit.
              </p>
            </div>
          </div>
        `;
        sendEmail({ to: settings.approvalNotificationEmail, subject, html }).catch(err => {
          console.error('Failed to send admin registration email:', err);
        });
      }
    });

    // Trigger real-time dashboard update for admins to refresh pending counts
    try {
      getIO().emit('admin:dashboard-update');
    } catch (socketErr) {
      console.warn('Socket emission failed in verifyEmail:', socketErr.message);
    }
  }

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
  const subject = 'New OTP for Verification - Staffingbetit';
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
  const subject = 'Password Reset Code - Staffingbetit';
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

  if (updates.profilePicture) {
    user.profilePicture = updates.profilePicture;
  }

  await user.save();
  return user;
};
