import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { toast } from 'sonner';
import { Calendar, Users, Copy, X, Clock, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { toDate, formatInTimeZone } from 'date-fns-tz';
import api from '../services/api';
import {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  copyWeekSchedule
} from '../services/schedule.service';

const AdminScheduling = () => {
  const [schedules, setSchedules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [loading, setLoading] = useState(false);
  const calendarRef = useRef(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null); // If editing
  const [modalDate, setModalDate] = useState('');
  const [modalStartTime, setModalStartTime] = useState('09:00');
  const [modalEndTime, setModalEndTime] = useState('18:00');
  const [modalTitle, setModalTitle] = useState('Regular Shift');
  const [modalColor, setModalColor] = useState('#4f46e5'); // Indigo

  // Copy Week State
  const [copyDate, setCopyDate] = useState('');
  const [isCopying, setIsCopying] = useState(false);

  // Timezone State
  const [viewTimezone, setViewTimezone] = useState('NPT'); // 'NPT' or 'US'
  const NPT_TZ = 'Asia/Kathmandu';
  const US_TZ = 'America/New_York';

  const dbToDisplayString = (dateStr, timeStr) => {
    if (viewTimezone === 'NPT') return `${dateStr}T${timeStr}:00`;
    const absoluteDate = toDate(`${dateStr}T${timeStr}:00`, { timeZone: NPT_TZ });
    return formatInTimeZone(absoluteDate, US_TZ, "yyyy-MM-dd'T'HH:mm:00");
  };

  const displayStringToDb = (isoStr) => {
    if (viewTimezone === 'NPT') {
      const [d, t] = isoStr.split('T');
      return { date: d, time: t.substring(0, 5) };
    }
    const absoluteDate = toDate(isoStr, { timeZone: US_TZ });
    const nptStr = formatInTimeZone(absoluteDate, NPT_TZ, "yyyy-MM-dd'T'HH:mm:00");
    const [d, t] = nptStr.split('T');
    return { date: d, time: t.substring(0, 5) };
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployee, viewTimezone]);

  const fetchEmployees = async () => {
    try {
      const { data } = await api.get('/admin/users', { params: { limit: 100 } });
      const empList = data.users.filter(u => u.role === 'EMPLOYEE');
      setEmployees(empList);
      if (empList.length > 0) {
        setSelectedEmployee(empList[0]._id);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load employees');
    }
  };

  const fetchSchedules = async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    try {
      const data = await getSchedules({ employeeId: selectedEmployee });
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
            employeeId: sch.employeeId._id || sch.employeeId,
            dbDate: sch.date,
            dbStartTime: sch.startTime,
            dbEndTime: sch.endTime,
          }
        };
      });
      setSchedules(formattedEvents);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (arg) => {
    if (!selectedEmployee) {
      return toast.warning('Please select an employee first');
    }

    // We treat arg.dateStr as the display time (since calendar maps local inputs to ISO)
    const displayIsoStr = arg.dateStr.includes('T') ? arg.dateStr : `${arg.dateStr}T09:00:00`;

    // For defaults, let's keep the modal date/time purely in Display Space (what the admin sees)
    const timePart = displayIsoStr.split('T')[1].substring(0, 5);
    setModalDate(displayIsoStr.split('T')[0]);
    setModalStartTime(timePart);

    // Auto-detect end time: 1 hour after the clicked time
    const [h, m] = timePart.split(':');
    const endHour = (parseInt(h, 10) + 1).toString().padStart(2, '0');
    const finalEndHour = parseInt(endHour, 10) > 23 ? '23' : endHour;
    const finalEndMinute = parseInt(endHour, 10) > 23 ? '59' : m;
    setModalEndTime(`${finalEndHour}:${finalEndMinute}`);

    setCurrentEvent(null);
    setModalTitle('Regular Shift');
    setIsModalOpen(true);
  };

  const handleEventClick = (arg) => {
    const event = arg.event;
    setCurrentEvent(event.id);

    // Convert Date objects to ISO strings matching local display
    const startIso = format(event.start, "yyyy-MM-dd'T'HH:mm:ss");
    const endIso = event.end ? format(event.end, "yyyy-MM-dd'T'HH:mm:ss") : startIso;

    setModalDate(startIso.split('T')[0]);
    setModalStartTime(startIso.split('T')[1].substring(0, 5));
    setModalEndTime(endIso.split('T')[1].substring(0, 5));
    setModalTitle(event.title);
    setModalColor(event.backgroundColor);
    setIsModalOpen(true);
  };

  const handleEventDrop = async (arg) => {
    const { event } = arg;
    try {
      const startIso = format(event.start, "yyyy-MM-dd'T'HH:mm:ss");
      const endIso = event.end ? format(event.end, "yyyy-MM-dd'T'HH:mm:ss") : format(event.start, "yyyy-MM-dd'T'HH:mm:ss");

      const dbStart = displayStringToDb(startIso);
      const dbEnd = displayStringToDb(endIso);

      await updateSchedule(event.id, {
        date: dbStart.date,
        startTime: dbStart.time,
        endTime: dbEnd.time,
        title: event.title,
        color: event.backgroundColor
      });
      toast.success('Schedule updated');
    } catch (error) {
      arg.revert();
      toast.error('Failed to update schedule');
    }
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    try {
      const startDisplayIso = `${modalDate}T${modalStartTime}:00`;
      const endDisplayIso = `${modalDate}T${modalEndTime}:00`;

      const dbStart = displayStringToDb(startDisplayIso);
      const dbEnd = displayStringToDb(endDisplayIso);

      if (currentEvent) {
        await updateSchedule(currentEvent, {
          date: dbStart.date,
          startTime: dbStart.time,
          endTime: dbEnd.time,
          title: modalTitle,
          color: modalColor
        });
        toast.success('Schedule updated');
      } else {
        await createSchedule({
          employeeId: selectedEmployee,
          date: dbStart.date,
          startTime: dbStart.time,
          endTime: dbEnd.time,
          title: modalTitle,
          color: modalColor
        });
        toast.success('Schedule created');
      }
      setIsModalOpen(false);
      fetchSchedules();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save schedule');
    }
  };

  const handleDeleteSchedule = async () => {
    if (!currentEvent) return;
    try {
      await deleteSchedule(currentEvent);
      toast.success('Schedule deleted');
      setIsModalOpen(false);
      fetchSchedules();
    } catch (error) {
      toast.error('Failed to delete schedule');
    }
  };

  const handleCopyWeek = async () => {
    if (!selectedEmployee) return toast.warning('Please select an employee');
    if (!copyDate) return toast.warning('Please select a source date (Day 1)');

    setIsCopying(true);
    try {
      await copyWeekSchedule(copyDate, selectedEmployee);
      toast.success('Schedule successfully copied to the rest of the week');
      fetchSchedules();
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.message || 'Failed to copy schedule';
      toast.error(errorMsg);
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-10">
      {/* Ultra-Compact Unified Header Toolbar */}
      <div className="bg-white p-3 sm:p-2 rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-3">
        <div className="flex items-center justify-between w-full lg:w-auto">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-50">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-[12px] font-black text-gray-900 leading-none">Shifts</h1>
              <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">Management</p>
            </div>
          </div>

          {/* Timezone (Mobile Top Right) */}
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-md p-0.5 shadow-sm sm:hidden">
            <button
              onClick={() => setViewTimezone('NPT')}
              className={`px-2 py-1 rounded-[4px] text-[7.5px] font-black uppercase tracking-wider transition-all ${viewTimezone === 'NPT' ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' : 'text-gray-400'}`}
            >
              NPT
            </button>
            <button
              onClick={() => setViewTimezone('US')}
              className={`px-2 py-1 rounded-[4px] text-[7.5px] font-black uppercase tracking-wider transition-all ${viewTimezone === 'US' ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' : 'text-gray-400'}`}
            >
              EST
            </button>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <div className="hidden sm:flex items-center bg-gray-50 border border-gray-200 rounded-md p-0.5 shadow-sm">
            <button
              onClick={() => setViewTimezone('NPT')}
              className={`px-2 py-1 rounded-[4px] text-[7.5px] font-black uppercase tracking-wider transition-all ${viewTimezone === 'NPT' ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
            >
              NPT
            </button>
            <button
              onClick={() => setViewTimezone('US')}
              className={`px-2 py-1 rounded-[4px] text-[7.5px] font-black uppercase tracking-wider transition-all ${viewTimezone === 'US' ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
            >
              EST
            </button>
          </div>

          <div className="flex-1 min-w-[120px] sm:flex-none flex items-center bg-white border border-gray-200 rounded-md px-2 py-1.5 shadow-sm">
            <Users className="w-3.5 h-3.5 text-gray-400 mr-2" />
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="bg-transparent border-none outline-none text-[10px] font-bold text-gray-700 w-full uppercase tracking-wider"
            >
              <option value="" disabled>Select Employee</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>{emp.name}</option>
              ))}
            </select>
          </div>

          {selectedEmployee && (
            <div className="flex items-center gap-2 pl-2 sm:pl-3 sm:border-l border-gray-100 shrink-0">
              <div className="w-8 h-8 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-600 overflow-hidden shadow-sm">
                {employees.find(e => e._id === selectedEmployee)?.profilePicture ? (
                  <img src={employees.find(e => e._id === selectedEmployee).profilePicture} className="w-full h-full object-cover" />
                ) : (
                  employees.find(e => e._id === selectedEmployee)?.name?.[0]
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <h2 className="text-[10px] font-black text-gray-900 leading-none mb-1 truncate max-w-[100px] sm:max-w-[150px]">
                  {employees.find(e => e._id === selectedEmployee)?.name}
                </h2>
                <p className="text-[8px] text-indigo-500 font-bold leading-none truncate max-w-[100px] sm:max-w-[150px]">
                  {employees.find(e => e._id === selectedEmployee)?.email?.toLowerCase()}
                </p>
              </div>
            </div>
          )}

          {selectedEmployee && (
            <div className="flex items-center gap-1 ml-auto sm:ml-0 bg-gray-50/50 p-1 rounded-md border border-gray-200 shrink-0">
              <input
                type="date"
                value={copyDate}
                onChange={(e) => setCopyDate(e.target.value)}
                className="text-[9px] font-bold border-none outline-none px-2 py-1.5 text-gray-600 bg-white rounded-md uppercase tracking-wider shadow-sm w-24"
              />
              <button
                onClick={handleCopyWeek}
                disabled={isCopying || !copyDate}
                className="flex items-center gap-1 bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-md"
              >
                <Copy className="w-3 h-3" />
                COPY
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Area */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 bg-white/50 flex items-center justify-center backdrop-blur-sm rounded-2xl">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <div className="calendar-container">
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
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              editable={true}
              selectable={true}
              eventDrop={handleEventDrop}
              allDaySlot={false}
              timeZone="local"
              height="75vh"
              scrollTime="09:00:00"
              slotMinTime="00:00:00"
              slotMaxTime="24:00:00"
              expandRows={true}
              stickyHeaderDates={true}
              handleWindowResize={true}
              eventTimeFormat={{
                hour: 'numeric',
                minute: '2-digit',
                meridiem: 'short'
              }}
              className="font-sans"
            />
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-gray-900/10">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {currentEvent ? 'Edit Schedule' : 'New Schedule'}
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">
                    {format(new Date(modalDate), 'EEEE, MMMM d, yyyy')} ({viewTimezone === 'NPT' ? 'NPT' : 'US EST'})
                  </p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 hover:bg-gray-100 p-2 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Shift Title</label>
                <input
                  type="text"
                  required
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-sm font-medium transition-all"
                  placeholder="e.g., Regular Shift"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Start Time</label>
                  <input
                    type="time"
                    required
                    value={modalStartTime}
                    onChange={(e) => setModalStartTime(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-sm font-medium transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Time</label>
                  <input
                    type="time"
                    required
                    value={modalEndTime}
                    onChange={(e) => setModalEndTime(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-sm font-medium transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {currentEvent && (
                  <button
                    type="button"
                    onClick={handleDeleteSchedule}
                    className="px-4 py-3 rounded-xl border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
                >
                  {currentEvent ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
        }
        .calendar-container .fc .fc-toolbar-title {
          font-size: 0.9rem;
          font-weight: 800;
          color: #111827;
        }
        @media (min-width: 640px) {
          .calendar-container .fc .fc-toolbar-title {
            font-size: 1.25rem;
          }
        }
        .calendar-container .fc .fc-button {
          font-weight: 700;
          text-transform: capitalize;
          border-radius: 0.5rem;
          padding: 0.3rem 0.6rem;
          font-size: 10px;
          box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
        }
        @media (min-width: 640px) {
          .calendar-container .fc .fc-button {
            padding: 0.4rem 0.8rem;
            font-size: 13px;
          }
        }
        .calendar-container .fc .fc-button-primary:not(:disabled):active, 
        .calendar-container .fc .fc-button-primary:not(:disabled).fc-button-active {
          background-color: #e0e7ff;
          color: #4f46e5;
          border-color: #c7d2fe;
        }
        .calendar-container .fc .fc-col-header-cell-cushion {
          padding: 0.5rem 0;
          font-weight: 600;
          color: #4b5563;
          text-transform: uppercase;
          font-size: 0.65rem;
          letter-spacing: 0.05em;
        }
        @media (min-width: 640px) {
          .calendar-container .fc .fc-col-header-cell-cushion {
            padding: 0.75rem 0;
            font-size: 0.75rem;
          }
        }
        .calendar-container .fc-theme-standard td, 
        .calendar-container .fc-theme-standard th {
          border-color: #f3f4f6;
        }
        .calendar-container .fc-timegrid-slot-label-cushion {
          font-size: 0.65rem;
          color: #6b7280;
          font-weight: 500;
        }
        @media (min-width: 640px) {
          .calendar-container .fc-timegrid-slot-label-cushion {
            font-size: 0.75rem;
          }
        }
        .calendar-container .fc-event {
          border-radius: 0.375rem;
          padding: 1px 2px;
          font-size: 0.65rem;
          font-weight: 600;
          border: none;
          box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
        }
        @media (min-width: 640px) {
          .calendar-container .fc-event {
            padding: 2px 4px;
            font-size: 0.75rem;
          }
        }
        .calendar-container .fc-event:hover {
          transform: scale(1.02);
          z-index: 10 !important;
        }
        /* Mobile specific toolbar compact single row */
        @media (max-width: 640px) {
          .fc-header-toolbar {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 2px !important;
            margin-bottom: 1rem !important;
          }
          .fc-toolbar-chunk {
            display: flex !important;
            align-items: center !important;
            gap: 1px !important;
          }
          .fc-toolbar-title {
            font-size: 0.6rem !important;
            font-weight: 900 !important;
            white-space: nowrap !important;
            margin: 0 4px !important;
            text-transform: uppercase !important;
            letter-spacing: -0.02em !important;
          }
          .fc .fc-button {
            padding: 3px 5px !important;
            font-size: 7px !important;
            height: auto !important;
          }
          .fc-header-toolbar > * {
            flex-shrink: 1;
          }
        }
        /* Ensure vertical scrollbar is always accessible */
        .calendar-container .fc-scroller-vertical {
          overflow-y: auto !important;
        }
        .calendar-container .fc-timegrid-slot {
          height: 3rem !important; /* Make slots a bit taller for easier scrolling/viewing */
        }
      `}</style>
    </div>
  );
};

export default AdminScheduling;
