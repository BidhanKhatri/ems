import express from 'express';
import { register, login, verifyEmail, resendOTP, forgotPassword, verifyResetOTP, resetPassword, getProfile, updateProfile } from '../controllers/auth.controller.js';
import { validate, registerSchema, loginSchema, verifyEmailSchema, resendOTPSchema, forgotPasswordSchema, verifyResetOTPSchema, resetPasswordSchema, updateProfileSchema } from '../validations/auth.validation.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);
router.post('/resend-otp', validate(resendOTPSchema), resendOTP);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/verify-reset-otp', validate(verifyResetOTPSchema), verifyResetOTP);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.get('/me', requireAuth, getProfile);
router.patch('/me', requireAuth, validate(updateProfileSchema), updateProfile);

export default router;
