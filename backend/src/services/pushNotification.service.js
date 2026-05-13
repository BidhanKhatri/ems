import admin from 'firebase-admin';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin SDK
try {
  // Use path.resolve to allow fallback if they put it in the root of backend
  const serviceAccountPath = path.resolve(process.cwd(), 'ems-notification-firebase-adminsdk.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin initialized successfully');
  } else {
    console.warn(`Firebase Admin SDK warning: file not found at ${serviceAccountPath}. Push notifications will not be sent until configured.`);
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error.message);
}

const isFirebaseInitialized = () => admin.apps.length > 0;

/**
 * Clean up invalid tokens from user document
 */
const removeInvalidTokens = async (userId, failedTokens) => {
  if (!failedTokens.length) return;
  try {
    await User.findByIdAndUpdate(userId, {
      $pullAll: { fcmTokens: failedTokens }
    });
  } catch (err) {
    console.error('Error removing invalid tokens:', err.message);
  }
};

/**
 * Send push notification to a specific user and save to DB
 */
export const sendToUser = async (userId, title, body, metadata = {}) => {
  try {
    const user = await User.findById(userId);
    if (!user) return false;

    // Save to DB
    await Notification.create({
      userId,
      audience: user.role,
      title,
      message: body,
      metadata,
    });

    if (!isFirebaseInitialized() || !user.fcmTokens || user.fcmTokens.length === 0) {
      return false;
    }

    const message = {
      notification: { title, body },
      data: {
        ...metadata,
        // Convert all values to strings as FCM data payload requires string values
        ...Object.fromEntries(Object.entries(metadata).map(([k, v]) => [k, String(v)]))
      },
      tokens: user.fcmTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    // Check for invalid tokens
    const failedTokens = [];
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          if (
            resp.error.code === 'messaging/invalid-registration-token' ||
            resp.error.code === 'messaging/registration-token-not-registered'
          ) {
            failedTokens.push(user.fcmTokens[idx]);
          }
        }
      });
      await removeInvalidTokens(userId, failedTokens);
    }
    
    return true;
  } catch (error) {
    console.error('Push notification error (sendToUser):', error.message);
    return false;
  }
};

/**
 * Send push notification to all admins
 */
export const sendToAdmins = async (title, body, metadata = {}) => {
  try {
    const admins = await User.find({ role: 'ADMIN', isActive: true });
    
    // Save to DB for each admin
    const notifications = admins.map(admin => ({
      userId: admin._id,
      audience: 'ADMIN',
      title,
      message: body,
      metadata,
    }));
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    if (!isFirebaseInitialized()) return false;

    // Collect all admin tokens
    const tokensMap = new Map(); // token -> userId for cleanup
    admins.forEach(admin => {
      if (admin.fcmTokens) {
        admin.fcmTokens.forEach(token => {
          tokensMap.set(token, admin._id);
        });
      }
    });

    const allTokens = Array.from(tokensMap.keys());
    if (allTokens.length === 0) return false;

    const message = {
      notification: { title, body },
      data: {
        ...metadata,
        ...Object.fromEntries(Object.entries(metadata).map(([k, v]) => [k, String(v)]))
      },
      tokens: allTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    if (response.failureCount > 0) {
      // Group failed tokens by user ID
      const failedByUserId = new Map();
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          if (
            resp.error.code === 'messaging/invalid-registration-token' ||
            resp.error.code === 'messaging/registration-token-not-registered'
          ) {
            const token = allTokens[idx];
            const userId = tokensMap.get(token);
            if (!failedByUserId.has(userId)) failedByUserId.set(userId, []);
            failedByUserId.get(userId).push(token);
          }
        }
      });
      
      // Cleanup invalid tokens
      for (const [userId, failedTokens] of failedByUserId.entries()) {
        await removeInvalidTokens(userId, failedTokens);
      }
    }
    return true;
  } catch (error) {
    console.error('Push notification error (sendToAdmins):', error.message);
    return false;
  }
};

/**
 * Send push notification to a specific role or everyone
 */
export const sendBroadcast = async (audience, title, body, metadata = {}) => {
  try {
    let query = { isActive: true };
    let notificationAudience = 'EMPLOYEE';
    
    if (audience === 'ADMIN') {
      query.role = 'ADMIN';
      notificationAudience = 'ADMIN';
    } else if (audience === 'EMPLOYEE') {
      query.role = 'EMPLOYEE';
    } else {
      // both
      notificationAudience = 'EMPLOYEE'; // We can just log as employee or multiple
    }

    const users = await User.find(query);
    
    // Depending on scale, we might not want to save a Notification row per user if it's huge,
    // but the schema implies per-user. We'll insert many.
    const notifications = users.map(u => ({
      userId: u._id,
      audience: u.role || 'EMPLOYEE',
      title,
      message: body,
      metadata,
    }));
    
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    if (!isFirebaseInitialized()) return false;

    const tokensMap = new Map();
    users.forEach(u => {
      if (u.fcmTokens) {
        u.fcmTokens.forEach(token => {
          tokensMap.set(token, u._id);
        });
      }
    });

    const allTokens = Array.from(tokensMap.keys());
    if (allTokens.length === 0) return false;

    // Send in chunks of 500 (FCM limit per multicast)
    const chunkSize = 500;
    for (let i = 0; i < allTokens.length; i += chunkSize) {
      const chunkTokens = allTokens.slice(i, i + chunkSize);
      const message = {
        notification: { title, body },
        data: {
          ...metadata,
          ...Object.fromEntries(Object.entries(metadata).map(([k, v]) => [k, String(v)]))
        },
        tokens: chunkTokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      if (response.failureCount > 0) {
        const failedByUserId = new Map();
        response.responses.forEach((resp, idx) => {
          if (!resp.success && (
              resp.error.code === 'messaging/invalid-registration-token' ||
              resp.error.code === 'messaging/registration-token-not-registered'
            )) {
            const token = chunkTokens[idx];
            const userId = tokensMap.get(token);
            if (!failedByUserId.has(userId)) failedByUserId.set(userId, []);
            failedByUserId.get(userId).push(token);
          }
        });
        
        for (const [userId, failedTokens] of failedByUserId.entries()) {
          await removeInvalidTokens(userId, failedTokens);
        }
      }
    }
    return true;
  } catch (error) {
    console.error('Push notification error (sendBroadcast):', error.message);
    return false;
  }
};
