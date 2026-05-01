import catchAsync from '../utils/catchAsync.js';
import * as groupService from '../services/group.service.js';

export const createGroup = catchAsync(async (req, res) => {
  const group = await groupService.createGroup(req.body.name, req.user.id);
  res.status(201).send(group);
});

export const updateGroup = catchAsync(async (req, res) => {
  const group = await groupService.updateGroup(req.params.id, req.body);
  res.status(200).send(group);
});

export const deleteGroup = catchAsync(async (req, res) => {
  await groupService.deleteGroup(req.params.id);
  res.status(200).send({ message: 'Group deleted' });
});

export const getGroups = catchAsync(async (req, res) => {
  const groups = await groupService.getGroups();
  res.status(200).send(groups);
});

export const addMembers = catchAsync(async (req, res) => {
  const group = await groupService.addMembers(req.params.id, req.body.userIds);
  res.status(200).send(group);
});

export const removeMember = catchAsync(async (req, res) => {
  const group = await groupService.removeMember(req.params.id, req.params.userId);
  res.status(200).send(group);
});

export const broadcastEmail = catchAsync(async (req, res) => {
  const result = await groupService.broadcastEmail(req.params.id, req.body);
  res.status(200).send({ message: `Email sent to ${result.sent} of ${result.total} members`, ...result });
});
