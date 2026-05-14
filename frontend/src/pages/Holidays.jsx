import { useState, useEffect } from 'react';
import api from '../services/api';
import { format, isAfter, isBefore, startOfDay, isWithinInterval } from 'date-fns';
import { Calendar as CalendarIcon, Umbrella, Info, ChevronRight, Clock } from 'lucide-react';

const Holidays = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const { data } = await api.get('/settings/holidays');
      // Sort by start date
      const sorted = data.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      setHolidays(sorted);
    } catch (error) {
      console.error('Failed to load holidays:', error);
    } finally {
      setLoading(false);
    }
  };

  const today = startOfDay(new Date());

  const upcomingHolidays = holidays.filter(h => !isBefore(new Date(h.endDate), today));
  const pastHolidays = holidays.filter(h => isBefore(new Date(h.endDate), today)).reverse();

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
            <Umbrella className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">Company Holidays</h1>
            <p className="hidden sm:block text-gray-500 text-xs sm:text-sm mt-0.5">Stay updated with scheduled breaks.</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-2 sm:px-5 sm:py-3 flex items-center gap-4 shadow-sm">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 leading-none">Total Holidays</p>
            <p className="text-lg sm:text-xl font-black text-gray-900 tabular-nums">{holidays.length}</p>
          </div>
        </div>
      </div>

      {/* Info Alert */}
      <div className="bg-white border-l-4 border-indigo-600 p-5 rounded-r-2xl shadow-sm flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <Info className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-gray-900 text-sm">Policy Notice</h3>
          <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">
            Attendance tracking is automatically paused during these dates. Points are not deducted on holidays.
          </p>
        </div>
      </div>

      {/* Holiday Sections */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/3 mb-4" />
              <div className="h-6 bg-gray-100 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : holidays.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-20 text-center">
          <Umbrella className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-400">No Holidays Scheduled</h3>
          <p className="text-gray-400 text-sm mt-1">Check back later for updated calendar events.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Upcoming Holidays */}
          {upcomingHolidays.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-6 bg-indigo-600 rounded-full" />
                <h2 className="text-lg font-black text-gray-900 uppercase tracking-wider">Upcoming Breaks</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {upcomingHolidays.map((h, idx) => (
                  <HolidayCard key={h._id} holiday={h} isUpcoming={true} index={idx} today={today} />
                ))}
              </div>
            </section>
          )}

          {/* Past Holidays */}
          {pastHolidays.length > 0 && (
            <section className="space-y-6 opacity-60 grayscale-[40%]">
              <div className="flex items-center gap-3">
                <div className="w-2 h-6 bg-gray-400 rounded-full" />
                <h2 className="text-lg font-black text-gray-400 uppercase tracking-wider">Past Holidays</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pastHolidays.map(h => (
                  <HolidayCard key={h._id} holiday={h} isUpcoming={false} today={today} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

const HolidayCard = ({ holiday, isUpcoming, index, today }) => {
  const start = new Date(holiday.startDate);
  const end = new Date(holiday.endDate);

  // Calculate duration
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  const isToday = isWithinInterval(today, { start: startOfDay(start), end: startOfDay(end) });
  const isTomorrow = format(new Date(today.getTime() + 86400000), 'yyyy-MM-dd') === format(start, 'yyyy-MM-dd');

  return (
    <div
      className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden flex flex-col"
    >
      {/* Decorative background element */}
      <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full ${isUpcoming ? 'bg-indigo-50/50' : 'bg-gray-50/50'}`} />

      <div className="flex flex-row justify-between items-start mb-4 relative z-10 gap-3">
        <div className="flex flex-col min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${isUpcoming ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'} whitespace-nowrap`}>
              {isUpcoming ? 'Active' : 'Completed'}
            </span>
            {isToday && (
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-rose-500 text-white animate-pulse whitespace-nowrap">
                Today
              </span>
            )}
            {isTomorrow && (
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-amber-500 text-white whitespace-nowrap">
                Starts Tomorrow
              </span>
            )}
            <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 flex items-center gap-1 whitespace-nowrap">
              <CalendarIcon className="w-2.5 h-2.5" /> {format(start, 'dd MMM')} — {format(end, 'dd MMM')}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight truncate-2-lines">{holiday.title}</h3>
        </div>

        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center border flex-shrink-0 ${isUpcoming ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
          <span className="text-[8px] sm:text-[10px] font-black uppercase leading-none">{format(start, 'MMM')}</span>
          <span className="text-base sm:text-xl font-black leading-none mt-0.5">{format(start, 'dd')}</span>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <CalendarIcon className={`w-4 h-4 ${isUpcoming ? 'text-indigo-400' : 'text-gray-300'}`} />
          <p className="text-xs font-bold text-gray-600 tabular-nums">
            {format(start, 'PPP')}
          </p>
        </div>
        {isUpcoming && <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />}
      </div>

      {!isUpcoming && (
        <p className="text-[10px] font-bold text-gray-400 mt-2 italic tabular-nums leading-none">
          Ended on {format(end, 'MMM dd, yyyy')}
        </p>
      )}
    </div>
  );
};

export default Holidays;
