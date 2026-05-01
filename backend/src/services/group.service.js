import Group from '../models/Group.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';

export const createGroup = async (name, adminId) => {
  const existing = await Group.findOne({ name });
  if (existing) {
    throw new ApiError(400, 'Group with this name already exists');
  }
  return await Group.create({ name, createdBy: adminId });
};

export const updateGroup = async (groupId, { name, employees }) => {
  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(404, 'Group not found');
  }

  if (name) group.name = name;
  if (employees) {
    group.employees = employees;
    await User.updateMany(
      { _id: { $in: employees } },
      { $set: { groupId: group._id } }
    );
  }

  await group.save();
  return group;
};

export const deleteGroup = async (groupId) => {
  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(404, 'Group not found');
  }
  await User.updateMany({ groupId: group._id }, { $set: { groupId: null } });
  await Group.deleteOne({ _id: groupId });
  return true;
};

export const getGroups = async () => {
  return await Group.find().populate('employees', 'name email performanceScore totalPoints');
};

export const addMembers = async (groupId, userIds) => {
  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, 'Group not found');

  const existingIds = group.employees.map(e => e.toString());
  const newIds = userIds.filter(id => !existingIds.includes(id));
  group.employees.push(...newIds);
  await group.save();

  await User.updateMany({ _id: { $in: newIds } }, { $set: { groupId: group._id } });

  return await Group.findById(groupId).populate('employees', 'name email performanceScore totalPoints');
};

export const removeMember = async (groupId, userId) => {
  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, 'Group not found');

  group.employees = group.employees.filter(e => e.toString() !== userId);
  await group.save();

  await User.findByIdAndUpdate(userId, { $set: { groupId: null } });

  return await Group.findById(groupId).populate('employees', 'name email performanceScore totalPoints');
};

export const broadcastEmail = async (groupId, { subject, message }) => {
  const group = await Group.findById(groupId).populate('employees', 'name email');
  if (!group) throw new ApiError(404, 'Group not found');
  if (!group.employees.length) throw new ApiError(400, 'Group has no members to send email to');

  const { sendEmail } = await import('../utils/mailer.js');

  const results = await Promise.allSettled(
    group.employees.map(emp =>
      sendEmail({
        to: emp.email,
        subject,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px">
            <h2 style="color:#4f46e5;margin-bottom:8px">Message to ${group.name}</h2>
            <p style="color:#374151">Dear ${emp.name},</p>
            <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #e5e7eb;color:#111827;white-space:pre-wrap">
${message}
            </div>
            <p style="color:#6b7280;font-size:12px;margin-top:24px">This message was broadcast to all members of the "${group.name}" group.</p>
          </div>
        `
      })
    )
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  return { sent, failed, total: group.employees.length };
};
