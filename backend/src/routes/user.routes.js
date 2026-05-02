import express from 'express';
import * as userController from '../controllers/user.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

router.use(requireAuth);

router.get('/profile', userController.getProfile);
router.post('/profile/picture', upload.single('image'), userController.updateProfilePicture);
router.delete('/profile/picture', userController.deleteProfilePicture);

export default router;
