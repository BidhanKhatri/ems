import catchAsync from '../utils/catchAsync.js';
import * as activityService from '../services/activity.service.js';

export const getStatus = catchAsync(async (req, res) => {
  const status = await activityService.getEmployeeActivityStatus(req.user.id);
  res.status(200).send(status);
});

export const markActive = catchAsync(async (req, res) => {
  const result = await activityService.markEmployeeActive(req.user, req.body, req);
  res.status(200).send(result);
});

export const getNotifications = catchAsync(async (req, res) => {
  const notifications = await activityService.getMyNotifications(req.user, req.query.sort);
  res.status(200).send(notifications);
});

export const getUnreadCount = catchAsync(async (req, res) => {
  const count = await activityService.getUnreadNotificationsCount(req.user);
  res.status(200).send({ count });
});

export const markNotificationRead = catchAsync(async (req, res) => {
  const notification = await activityService.markNotificationRead(req.user, req.params.id);
  res.status(200).send(notification);
});

export const getAdminFeed = catchAsync(async (req, res) => {
  const feed = await activityService.getAdminActivityFeed({
    page: req.query.page,
    limit: req.query.limit,
    search: req.query.search,
    event: req.query.event,
    from: req.query.from,
    to: req.query.to,
  });
  res.status(200).send(feed);
});
