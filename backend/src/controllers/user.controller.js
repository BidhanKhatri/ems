import catchAsync from '../utils/catchAsync.js';
import User from '../models/User.js';
import { cloudinary } from '../config/cloudinary.js';

export const getProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id).populate('groupId', 'name');
  res.status(200).send(user);
});

export const updateProfilePicture = catchAsync(async (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'No file uploaded' });
  }

  const user = await User.findById(req.user.id);
  
  // Delete old image from cloudinary if exists
  if (user.cloudinaryId) {
    try {
      await cloudinary.uploader.destroy(user.cloudinaryId);
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      // Continue anyway to update to new picture
    }
  }

  user.profilePicture = req.file.path;
  user.cloudinaryId = req.file.filename; // multer-storage-cloudinary provides filename as public_id
  await user.save();

  res.status(200).send({
    message: 'Profile picture updated successfully',
    profilePicture: user.profilePicture
  });
});

export const deleteProfilePicture = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  if (!user.cloudinaryId) {
    return res.status(400).send({ message: 'No profile picture to delete' });
  }

  try {
    await cloudinary.uploader.destroy(user.cloudinaryId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return res.status(500).send({ message: 'Failed to delete image from storage. Please check Cloudinary configuration.' });
  }
  
  user.profilePicture = null;
  user.cloudinaryId = null;
  await user.save();

  res.status(200).send({ message: 'Profile picture removed successfully' });
});
