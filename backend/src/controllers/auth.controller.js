import catchAsync from '../utils/catchAsync.js';
import * as authService from '../services/auth.service.js';

export const register = catchAsync(async (req, res) => {
  const user = await authService.registerUser(req.body);
  res.status(201).send({
    code: 201,
    message: 'User registered successfully. Please check terminal (mock email) for verification token.',
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  });
});

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = authService.generateTokens(user.id, user.role);
  
  res.send({ 
    user: { id: user._id, name: user.name, email: user.email, role: user.role, performanceScore: user.performanceScore }, 
    tokens 
  });
});

export const verifyEmail = catchAsync(async (req, res) => {
  const { email, otp } = req.body;
  await authService.verifyEmail(email, otp);
  res.send({ code: 200, message: 'Email verified successfully. You can now login.' });
});

export const resendOTP = catchAsync(async (req, res) => {
  const { email } = req.body;
  await authService.resendOTP(email);
  res.send({ code: 200, message: 'A new OTP has been sent to your email.' });
});

export const getProfile = catchAsync(async (req, res) => {
  const user = req.user;
  res.send({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      performanceScore: user.performanceScore,
    },
  });
});

export const updateProfile = catchAsync(async (req, res) => {
  const updatedUser = await authService.updateUserProfile(req.user.id, req.body);

  res.send({
    code: 200,
    message: 'Profile updated successfully',
    user: {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      performanceScore: updatedUser.performanceScore,
    },
  });
});

export const forgotPassword = catchAsync(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  res.send({ code: 200, message: 'Password reset OTP has been sent to your email.' });
});

export const verifyResetOTP = catchAsync(async (req, res) => {
  const { email, otp } = req.body;
  await authService.verifyResetOTP(email, otp);
  res.send({ code: 200, message: 'OTP verified successfully. You can now reset your password.' });
});

export const resetPassword = catchAsync(async (req, res) => {
  const { email, otp, password } = req.body;
  await authService.resetPassword(email, otp, password);
  res.send({ code: 200, message: 'Password has been reset successfully. You can now login.' });
});
