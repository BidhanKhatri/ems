import Schedule from '../models/Schedule.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import { parse, addDays, format, getDay } from 'date-fns';

// @desc    Get all schedules
// @route   GET /api/schedules
// @access  Private/Admin
export const getSchedules = catchAsync(async (req, res) => {
  const { employeeId, startDate, endDate } = req.query;
  const filter = {};

  if (req.user.role === 'EMPLOYEE') {
    filter.employeeId = req.user._id;
  } else if (employeeId) {
    filter.employeeId = employeeId;
  }
  
  if (startDate && endDate) {
    filter.date = { $gte: startDate, $lte: endDate };
  } else if (startDate) {
    filter.date = { $gte: startDate };
  } else if (endDate) {
    filter.date = { $lte: endDate };
  }

  const schedules = await Schedule.find(filter).populate('employeeId', 'name email').lean();

  res.status(200).json({
    success: true,
    data: schedules,
  });
});

// @desc    Create a schedule
// @route   POST /api/schedules
// @access  Private/Admin
export const createSchedule = catchAsync(async (req, res) => {
  const { employeeId, date, startTime, endTime, title, color } = req.body;

  if (!employeeId || !date || !startTime || !endTime) {
    throw new ApiError(400, 'Please provide employeeId, date, startTime, and endTime');
  }

  const user = await User.findById(employeeId);
  if (!user || user.role !== 'EMPLOYEE') {
    throw new ApiError(404, 'Employee not found');
  }

  const schedule = await Schedule.create({
    employeeId,
    date,
    startTime,
    endTime,
    title,
    color,
  });

  const populatedSchedule = await Schedule.findById(schedule._id).populate('employeeId', 'name email');

  res.status(201).json({
    success: true,
    data: populatedSchedule,
  });
});

// @desc    Update a schedule
// @route   PUT /api/schedules/:id
// @access  Private/Admin
export const updateSchedule = catchAsync(async (req, res) => {
  let schedule = await Schedule.findById(req.params.id);

  if (!schedule) {
    throw new ApiError(404, 'Schedule not found');
  }

  const { date, startTime, endTime, title, color } = req.body;

  schedule = await Schedule.findByIdAndUpdate(
    req.params.id,
    { date, startTime, endTime, title, color },
    { new: true, runValidators: true }
  ).populate('employeeId', 'name email');

  res.status(200).json({
    success: true,
    data: schedule,
  });
});

// @desc    Delete a schedule
// @route   DELETE /api/schedules/:id
// @access  Private/Admin
export const deleteSchedule = catchAsync(async (req, res) => {
  const schedule = await Schedule.findById(req.params.id);

  if (!schedule) {
    throw new ApiError(404, 'Schedule not found');
  }

  await schedule.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
    message: 'Schedule deleted',
  });
});

// @desc    Copy Day 1 schedule to the rest of the week
// @route   POST /api/schedules/copy-week
// @access  Private/Admin
export const copyWeekSchedule = catchAsync(async (req, res) => {
  const { sourceDate, employeeId } = req.body;

  if (!sourceDate || !employeeId) {
    throw new ApiError(400, 'Please provide sourceDate and employeeId');
  }

  // Find schedules for the selected employee on the source date
  const sourceSchedules = await Schedule.find({ date: sourceDate, employeeId });

  if (sourceSchedules.length === 0) {
    throw new ApiError(404, 'No schedules found for the selected date and employee');
  }

  // Parse sourceDate safely to avoid timezone offset issues
  const [year, month, day] = sourceDate.split('-');
  const parsedDate = new Date(year, month - 1, day);
  const dayOfWeek = getDay(parsedDate); // 0 (Sunday) to 6 (Saturday)

  // We want to copy to the remaining weekdays (Monday-Friday, 1 to 5)
  // Determine which days to copy to. Assuming Monday is the start of the workweek.
  // We'll copy from the current day up to Friday.
  // Or simply, we can copy to all other weekdays (1 to 5) in the same week.
  
  // Let's find the Monday of this week
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = addDays(parsedDate, diffToMonday);

  const newSchedules = [];

  for (let i = 0; i < 5; i++) { // Monday to Friday
    const targetDate = addDays(monday, i);
    const targetDateStr = format(targetDate, 'yyyy-MM-dd');
    
    // Skip the source date itself
    if (targetDateStr === sourceDate) continue;

    // Delete existing schedules for this employee on the target date to avoid duplicates
    await Schedule.deleteMany({ date: targetDateStr, employeeId });

    // Copy schedules
    for (const s of sourceSchedules) {
      newSchedules.push({
        employeeId: s.employeeId,
        date: targetDateStr,
        startTime: s.startTime,
        endTime: s.endTime,
        title: s.title,
        color: s.color,
      });
    }
  }

  if (newSchedules.length > 0) {
    await Schedule.insertMany(newSchedules);
  }

  res.status(200).json({
    success: true,
    message: `Schedule copied to the rest of the week for employee`,
  });
});
