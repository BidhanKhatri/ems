import { format, parseISO } from 'date-fns';

export const formatDate = (dateString, formatStr = 'MMM dd, yyyy') => {
  if (!dateString) return '';
  return format(parseISO(dateString), formatStr);
};

export const formatTime = (dateString) => {
  if (!dateString) return '--:--';
  return format(parseISO(dateString), 'hh:mm a');
};

export const formatSimpleTime = (timeStr) => {
  if (!timeStr) return '--:--';
  const [hours, minutes] = timeStr.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return format(date, 'hh:mm a');
};
