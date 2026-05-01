import catchAsync from '../utils/catchAsync.js';
import * as attendanceService from '../services/attendance.service.js';

export const checkIn = catchAsync(async (req, res) => {
  const attendance = await attendanceService.checkIn(req.user.id);
  res.status(200).send({
    message: 'Check-in successful',
    attendance
  });
});

export const checkOut = catchAsync(async (req, res) => {
  const attendance = await attendanceService.checkOut(req.user.id);
  res.status(200).send({
    message: 'Check-out successful',
    attendance
  });
});

export const getMyAttendance = catchAsync(async (req, res) => {
  const records = await attendanceService.getMyAttendance(req.user.id);
  res.status(200).send(records);
});

export const getMyPerformance = catchAsync(async (req, res) => {
  const logs = await attendanceService.getMyPerformance(req.user.id);
  res.status(200).send(logs);
});
