import { format, parseISO } from 'date-fns';

export const formatDate = (dateString, formatStr = 'MMM dd, yyyy') => {
  if (!dateString) return '';
  return format(parseISO(dateString), formatStr);
};

export const formatTime = (dateString) => {
  if (!dateString) return '--:--';
  return format(parseISO(dateString), 'hh:mm a');
};
