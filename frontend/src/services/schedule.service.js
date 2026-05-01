import api from './api';

export const getSchedules = async (filters = {}) => {
  const { data } = await api.get('/schedules', { params: filters });
  return data;
};

export const createSchedule = async (scheduleData) => {
  const { data } = await api.post('/schedules', scheduleData);
  return data;
};

export const updateSchedule = async (id, scheduleData) => {
  const { data } = await api.put(`/schedules/${id}`, scheduleData);
  return data;
};

export const deleteSchedule = async (id) => {
  const { data } = await api.delete(`/schedules/${id}`);
  return data;
};

export const copyWeekSchedule = async (sourceDate, employeeId) => {
  const { data } = await api.post('/schedules/copy-week', { sourceDate, employeeId });
  return data;
};
