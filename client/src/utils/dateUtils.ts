import { format, parseISO, isValid, addDays, startOfWeek, endOfWeek } from 'date-fns';
import ja from 'date-fns/locale/ja';

export const formatDate = (date: string | Date, formatStr: string = 'yyyy年MM月dd日'): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      return 'Invalid Date';
    }
    return format(dateObj, formatStr, { locale: ja });
  } catch (error) {
    return 'Invalid Date';
  }
};

export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, 'yyyy年MM月dd日 HH:mm');
};

export const formatDateForInput = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      return '';
    }
    return format(dateObj, 'yyyy-MM-dd');
  } catch (error) {
    return '';
  }
};

export const formatDateTimeForInput = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      return '';
    }
    return format(dateObj, "yyyy-MM-dd'T'HH:mm");
  } catch (error) {
    return '';
  }
};

export const getWeekDates = (date: Date): Date[] => {
  const start = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
  const end = endOfWeek(date, { weekStartsOn: 0 }); // Saturday
  
  const dates: Date[] = [];
  let currentDate = start;
  
  while (currentDate <= end) {
    dates.push(new Date(currentDate));
    currentDate = addDays(currentDate, 1);
  }
  
  return dates;
};

export const getDayName = (date: Date): string => {
  return format(date, 'E', { locale: ja });
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.toDateString() === date2.toDateString();
};