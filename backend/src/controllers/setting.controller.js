import catchAsync from '../utils/catchAsync.js';
import * as settingService from '../services/setting.service.js';

export const getSettings = catchAsync(async (req, res) => {
  const settings = await settingService.getSettings();
  res.status(200).send(settings);
});

export const updateSettings = catchAsync(async (req, res) => {
  const settings = await settingService.updateSettings(req.body);
  res.status(200).send(settings);
});

export const getHolidays = catchAsync(async (req, res) => {
  const holidays = await settingService.getHolidays();
  res.status(200).send(holidays);
});

export const createHoliday = catchAsync(async (req, res) => {
  const { title, startDate, endDate } = req.body;
  const holiday = await settingService.createHoliday(title, startDate, endDate, req.user.id);
  res.status(201).send(holiday);
});

export const deleteHoliday = catchAsync(async (req, res) => {
  await settingService.deleteHoliday(req.params.id);
  res.status(200).send({ message: 'Holiday removed' });
});

export const getTodayStatus = catchAsync(async (req, res) => {
  const status = await settingService.getTodayStatus(req.user.id);
  res.status(200).send(status);
});
