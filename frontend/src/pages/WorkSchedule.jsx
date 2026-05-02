import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { toast } from 'sonner';
import { Calendar, Clock, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { toDate, formatInTimeZone } from 'date-fns-tz';
import api from '../services/api';
import { getSchedules } from '../services/schedule.service';
import useAuthStore from '../store/useAuthStore';

const WorkSchedule = () => {
  const { user } = useAuthStore();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const calendarRef = useRef(null);

  // Timezone State
  const [viewTimezone, setViewTimezone] = useState('NPT'); // 'NPT' or 'US'
  const NPT_TZ = 'Asia/Kathmandu';
  const US_TZ = 'America/New_York';

  const dbToDisplayString = (dateStr, timeStr) => {
    if (viewTimezone === 'NPT') return `${dateStr}T${timeStr}:00`;
    const absoluteDate = toDate(`${dateStr}T${timeStr}:00`, { timeZone: NPT_TZ });
    return formatInTimeZone(absoluteDate, US_TZ, "yyyy-MM-dd'T'HH:mm:00");
  };

  useEffect(() => {
    fetchSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewTimezone]);

  const fetchSchedules = async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      const data = await getSchedules({ employeeId: user._id });
      const formattedEvents = data.data.map(sch => {
        const displayStart = dbToDisplayString(sch.date, sch.startTime);
        const displayEnd = dbToDisplayString(sch.date, sch.endTime);
        return {
          id: sch._id,
          title: sch.title,
          start: displayStart,
          end: displayEnd,
          backgroundColor: sch.color,
          borderColor: sch.color,
          extendedProps: {
            dbDate: sch.date,
            dbStartTime: sch.startTime,
            dbEndTime: sch.endTime,
          }
        };
      });
      setSchedules(formattedEvents);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load your work schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header Area */}
      <div className="relative overflow-hidden rounded-xl bg-white px-4 sm:px-6 py-4 sm:py-6 shadow-sm border border-gray-200">
        <div className="absolute top-0 right-0 -translate-y-8 translate-x-8 opacity-20 pointer-events-none">
          <svg width="80" height="80" viewBox="0 0 200 200" fill="none" className="sm:w-[120px] sm:h-[120px]"><circle cx="100" cy="100" r="100" fill="#e0e7ff" /></svg>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 rounded-xl sm:rounded-xl flex items-center justify-center text-indigo-700 shadow-sm border border-white">
               <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-gray-800 tracking-tight">Work Schedule</h1>
              <p className="hidden xs:block text-[10px] sm:text-xs text-gray-500 font-medium italic mt-0.5">Stay on track with your shifts</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Timezone Toggle */}
            <div className="flex items-center bg-gray-100 border border-gray-200 rounded-xl p-0.5 sm:p-1 shadow-inner">
              <button
                onClick={() => setViewTimezone('NPT')}
                className={`flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-black tracking-widest uppercase transition-all ${viewTimezone === 'NPT' ? 'bg-white text-indigo-800 shadow-sm border border-gray-200' : 'text-gray-500'}`}
              >
                <Globe className="w-3 h-3" />
                NEPAL
              </button>
              <button
                onClick={() => setViewTimezone('US')}
                className={`flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-black tracking-widest uppercase transition-all ${viewTimezone === 'US' ? 'bg-white text-indigo-800 shadow-sm border border-gray-200' : 'text-gray-500'}`}
              >
                <Globe className="w-3 h-3" />
                US EST
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Area */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8">
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 bg-white/50 flex items-center justify-center backdrop-blur-sm rounded-xl">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <div className="calendar-container">
            {!loading && schedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-40 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                <div className="w-16 h-16 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center mb-4">
                   <Clock className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-black text-gray-800 tracking-tight">No Schedule Assigned</h3>
                <p className="text-xs text-gray-500 font-medium max-w-[240px] mx-auto mt-2 leading-relaxed">
                  You haven't been assigned any shifts for this period. Please contact HR or your Manager.
                </p>
              </div>
            ) : (
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView={window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek'}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                events={schedules}
                editable={false}
                selectable={false}
                allDaySlot={false}
                timeZone="local"
                height="auto"
                eventTimeFormat={{
                  hour: 'numeric',
                  minute: '2-digit',
                  meridiem: 'short'
                }}
                slotMinTime="00:00:00"
                slotMaxTime="24:00:00"
                className="font-sans"
                nowIndicator={true}
              />
            )}
          </div>
        </div>
      </div>

      <style>{`
        .calendar-container .fc {
          --fc-border-color: #f3f4f6;
          --fc-button-text-color: #4b5563;
          --fc-button-bg-color: #ffffff;
          --fc-button-border-color: #e5e7eb;
          --fc-button-hover-bg-color: #f9fafb;
          --fc-button-hover-border-color: #d1d5db;
          --fc-button-active-bg-color: #f3f4f6;
          --fc-button-active-border-color: #d1d5db;
          --fc-today-bg-color: #eff6ff;
          --fc-event-bg-color: #4f46e5;
          --fc-event-border-color: #4f46e5;
          --fc-now-indicator-color: #ef4444;
        }
        .calendar-container .fc .fc-toolbar-title {
          font-size: 0.9rem;
          font-weight: 900;
          color: #111827;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        @media (min-width: 640px) {
          .calendar-container .fc .fc-toolbar-title {
            font-size: 1rem;
          }
        }
        .calendar-container .fc .fc-button {
          font-weight: 800;
          text-transform: uppercase;
          font-size: 8px;
          letter-spacing: 0.05em;
          border-radius: 8px;
          padding: 4px 8px;
          border: 1px solid #e5e7eb;
          transition: all 0.2s;
        }
        @media (min-width: 640px) {
          .calendar-container .fc .fc-button {
            font-size: 9px;
            letter-spacing: 0.1em;
            border-radius: 10px;
            padding: 6px 12px;
          }
        }
        .calendar-container .fc .fc-button-primary:not(:disabled):active, 
        .calendar-container .fc .fc-button-primary:not(:disabled).fc-button-active {
          background-color: #4f46e5 !important;
          color: #ffffff !important;
          border-color: #4f46e5 !important;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        .calendar-container .fc .fc-col-header-cell-cushion {
          padding: 0.5rem 0;
          font-weight: 800;
          color: #4b5563;
          text-transform: uppercase;
          font-size: 8px;
          letter-spacing: 0.1em;
        }
        @media (min-width: 640px) {
          .calendar-container .fc .fc-col-header-cell-cushion {
            padding: 1rem 0;
            font-size: 9px;
            letter-spacing: 0.15em;
          }
        }
        .calendar-container .fc-theme-standard td, 
        .calendar-container .fc-theme-standard th {
          border-color: #f3f4f6;
        }
        .calendar-container .fc-timegrid-slot-label-cushion {
          font-size: 8px;
          color: #9ca3af;
          font-weight: 700;
          text-transform: uppercase;
        }
        @media (min-width: 640px) {
          .calendar-container .fc-timegrid-slot-label-cushion {
            font-size: 9px;
          }
        }
        .calendar-container .fc-event {
          border-radius: 8px;
          padding: 2px 4px;
          font-size: 8px;
          font-weight: 800;
          border: none;
          box-shadow: 0 2px 4px -1px rgb(0 0 0 / 0.1);
          margin: 1px;
        }
        @media (min-width: 640px) {
          .calendar-container .fc-event {
            border-radius: 10px;
            padding: 4px 8px;
            font-size: 10px;
          }
        }
        .calendar-container .fc-timegrid-event .fc-event-main {
          padding: 2px;
        }
        @media (min-width: 640px) {
          .calendar-container .fc-timegrid-event .fc-event-main {
            padding: 4px;
          }
        }
        .calendar-container .fc-daygrid-event {
           white-space: normal !important;
           align-items: center;
        }
        .fc-timegrid-now-indicator-line {
          border-color: #ef4444 !important;
          border-width: 2px !important;
        }
        .fc-timegrid-now-indicator-arrow {
          border-color: #ef4444 !important;
          background-color: #ef4444 !important;
        }
        /* Mobile specific toolbar stacking */
        @media (max-width: 640px) {
          .fc-header-toolbar {
            flex-direction: column;
            gap: 12px;
          }
          .fc-toolbar-chunk {
            display: flex;
            justify-content: center;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default WorkSchedule;
