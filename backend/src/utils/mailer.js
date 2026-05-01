import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import SystemSettings from '../models/SystemSettings.js';

dotenv.config();

export const sendEmail = async ({ to, subject, html }) => {
  try {
    // Fetch latest SMTP settings from DB
    const settings = await SystemSettings.findOne();
    
    const smtpHost = settings?.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = settings?.smtpPort || process.env.SMTP_PORT || 465;
    const smtpUser = settings?.smtpUser || process.env.SMTP_USER;
    const smtpPass = settings?.smtpPass || process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      console.error('SMTP configuration missing in both DB and .env');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: Number(smtpPort) === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false // Helps with some Gmail certificate issues
      }
    });

    const info = await transporter.sendMail({
      from: `"EMS Admin" <${smtpUser}>`,
      to,
      subject,
      html,
    });
    
    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
  }
};
