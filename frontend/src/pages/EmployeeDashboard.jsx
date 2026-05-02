import { useState, useEffect, useMemo } from 'react';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';
import { toast } from 'sonner';
import { Clock, Star, Trophy, Activity, Calendar, CheckCircle2, XCircle, AlertCircle, Zap, LogIn, LogOut, TrendingUp, TrendingDown, Crown } from 'lucide-react';
import { formatTime, formatSimpleTime } from '../utils/formatDate';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import SlideButton from '../components/SlideButton';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, isValid } from 'date-fns';

let lastDevInitAt = 0;

const EmployeeDashboard = () => {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [todayStatus, setTodayStatus] = useState({ isHoliday: false, message: '' });
  const [settings, setSettings] = useState(null);
  const [showEarlyModal, setShowEarlyModal] = useState(false);

  // Performance Analytics
  const [performanceLogs, setPerformanceLogs] = useState([]);
  const [chartFilter, setChartFilter] = useState('monthly');

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState([]);
  const [selfRank, setSelfRank] = useState(null);
  const [lbLoading, setLbLoading] = useState(true);

  useEffect(() => {
    if (import.meta.env.DEV) {
      const now = Date.now();
      if (now - lastDevInitAt < 1500) return;
      lastDevInitAt = now;
    }
    fetchTodayData();
    fetchPerformanceData();
    fetchLeaderboard();
    fetchLatestProfile();
  }, []);

  const fetchLatestProfile = async () => {
    try {
      const { data } = await api.get('/users/profile');
      if (data) setUser(data);
    } catch (error) {
      console.error('Failed to sync profile', error);
    }
  };

  const fetchTodayData = async () => {
    try {
      const [statusRes, settingsRes] = await Promise.all([
        api.get('/settings/today-status'),
        api.get('/settings')
      ]);
      setTodayStatus(statusRes.data);
      setSettings(settingsRes.data);

      if (!statusRes.data.isHoliday) {
        const { data } = await api.get('/attendance/me');
        if (!Array.isArray(data)) { setTodayAttendance(null); return; }
        const todayString = format(new Date(), 'yyyy-MM-dd');
        const todayRecord = data.find((r) => r.date === todayString);
        setTodayAttendance(todayRecord);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchPerformanceData = async () => {
    try {
      const { data } = await api.get('/attendance/performance');
      setPerformanceLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to grab performance', error);
      setPerformanceLogs([]);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const { data } = await api.get('/attendance/leaderboard');
      setLeaderboard(data.leaderboard || []);
      setSelfRank(data.selfRank);
    } catch (error) {
      console.error('Failed to fetch leaderboard', error);
    } finally {
      setLbLoading(false);
    }
  };

  const chartData = useMemo(() => {
    const now = new Date();
    let interval;
    if (chartFilter === 'weekly') {
      interval = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    } else if (chartFilter === 'monthly') {
      interval = { start: startOfMonth(now), end: endOfMonth(now) };
    } else {
      interval = { start: startOfYear(now), end: endOfYear(now) };
    }

    const filtered = performanceLogs.filter((log) => {
      if (!log?.date) return false;
      const parsedDate = parseISO(log.date);
      return isValid(parsedDate) && isWithinInterval(parsedDate, interval);
    });

    let cumulative = 0;
    const grouped = filtered.reduce((acc, log) => {
      const parsedDate = parseISO(log.date);
      const day = format(parsedDate, 'MMM dd');
      if (!acc[day]) acc[day] = { date: day, points: 0 };
      acc[day].points += Number(log.points || 0);
      return acc;
    }, {});

    return Object.values(grouped).map(entry => {
      cumulative += entry.points;
      return { ...entry, netScore: cumulative };
    }).filter((entry) => Number.isFinite(entry.netScore));
  }, [performanceLogs, chartFilter]);

  const attendanceStatus = todayAttendance?.status || 'ON_TIME';
  const pointsAwarded = Number(todayAttendance?.pointsAwarded || 0);

  const isCheckOutTimeCrossed = useMemo(() => {
    if (!settings?.checkOutTime || todayAttendance) return false;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const [outH, outM] = settings.checkOutTime.split(':').map(Number);
    const outMins = outH * 60 + outM;
    return currentMins > outMins;
  }, [settings, todayAttendance]);

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/attendance/check-in');
      toast.success(data.message);
      setTodayAttendance(data.attendance);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (bypass = false) => {
    if (!bypass && settings?.checkOutTime) {
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const [targetH, targetM] = settings.checkOutTime.split(':').map(Number);
      const targetMins = targetH * 60 + targetM;
      if (currentMins < targetMins) {
        setShowEarlyModal(true);
        return;
      }
    }
    
    setShowEarlyModal(false);
    setLoading(true);
    try {
      const { data } = await api.post('/attendance/check-out');
      toast.success(data.message);
      setTodayAttendance(data.attendance);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Check-out failed');
    } finally {
      setLoading(false);
    }
  };

const WorkProgressBar = ({ settings, todayAttendance }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000); // Update every 10 seconds
    return () => clearInterval(timer);
  }, []);

  if (!settings || !todayAttendance || todayAttendance.checkOutTime) return null;

  const currentMins = now.getHours() * 60 + now.getMinutes();
  const [inH, inM] = settings.checkInTime.split(':').map(Number);
  const startMins = inH * 60 + inM;
  const [outH, outM] = settings.checkOutTime.split(':').map(Number);
  const endMins = outH * 60 + outM;

  const totalDuration = endMins - startMins;
  if (!Number.isFinite(totalDuration) || totalDuration <= 0) return null;

  const elapsed = Math.max(0, currentMins - startMins);
  let percentage = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  if (!Number.isFinite(percentage)) percentage = 0;

  let barColor = 'bg-red-500';
  if (percentage >= 33 && percentage < 66) barColor = 'bg-yellow-500';
  else if (percentage >= 66) barColor = 'bg-green-500';

  return (
    <div className="w-full mt-4 bg-[#F2EFE9] p-4 border border-stone-200 rounded-xl select-none pointer-events-none">
      <div className="flex justify-between text-xs font-semibold text-stone-600 mb-2">
        <span>Check In: {formatSimpleTime(settings.checkInTime)}</span>
        <span>Progress: {Math.round(percentage)}%</span>
        <span>Check Out: {formatSimpleTime(settings.checkOutTime)}</span>
      </div>
      <div className="w-full bg-stone-200 rounded-full h-3.5 mb-2 overflow-hidden shadow-inner">
        <div
          className={`${barColor} h-3.5 rounded-full transition-all linear`}
          style={{ width: `${percentage}%`, transitionDuration: '10000ms' }}
        />
      </div>
      <p className="text-[10px] text-stone-400 font-medium text-center italic mt-1">Updates live every 10 seconds</p>
    </div>
  );
};

  return (
    <div className="space-y-6 pb-10">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#FAF8F5] px-4 py-4 sm:px-6 sm:py-5 shadow-sm border border-stone-200">
        <div className="absolute top-0 right-0 -translate-y-8 translate-x-8 opacity-20 pointer-events-none">
          <svg width="140" height="140" viewBox="0 0 200 200" fill="none"><circle cx="100" cy="100" r="100" fill="#e7d8cc" /></svg>
        </div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 opacity-20 pointer-events-none">
          <svg width="180" height="180" viewBox="0 0 200 200" fill="none"><circle cx="100" cy="100" r="100" fill="#f1e7df" /></svg>
        </div>
        <div className="relative z-10 flex items-center justify-between gap-3">
          {/* User Info & Avatar Group */}
          <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0 border-2 border-white shadow-sm overflow-hidden">
              {user?.profilePicture ? (
                <img src={user.profilePicture} className="w-full h-full object-cover" alt="User" />
              ) : (
                <span className="text-amber-800 font-black text-lg sm:text-xl">{user?.name?.charAt(0)?.toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="hidden sm:inline-flex items-center gap-1.5 bg-amber-100 px-2.5 py-0.5 rounded-full text-amber-800 text-[9px] font-bold uppercase tracking-widest mb-1.5 border border-amber-200/50">
                <Star className="w-2.5 h-2.5 text-amber-600" fill="currentColor" />
                <span>Employee Dashboard</span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-stone-800 tracking-tight leading-tight truncate">
                Hello, {user?.name?.split(' ')[0]}
              </h1>
              <p className="text-stone-500 text-[10px] sm:text-sm font-medium truncate sm:mt-0.5">Keep up the great work!</p>
            </div>
          </div>

          {/* Points Badge */}
          <div className="flex items-center gap-2 sm:gap-3 bg-white/80 backdrop-blur-sm border border-stone-200/60 px-2.5 py-1.5 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex-shrink-0">
            <div className="bg-amber-100 p-1.5 sm:p-2 rounded-lg sm:rounded-xl">
              <Trophy className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-amber-700" />
            </div>
            <div className="flex flex-col">
              <span className="hidden sm:block text-stone-500 text-[9px] font-bold uppercase tracking-widest leading-none mb-1">Total Points</span>
              <span className="text-lg sm:text-2xl font-black text-stone-800 tracking-tight leading-none">
                {user?.performanceScore || 0}
                <span className="sm:hidden text-[9px] text-stone-400 font-bold ml-1 uppercase">pts</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2-col grid: Time Tracking | Team Leaderboard ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Check-In Card */}
        <div className="bg-[#FAF8F5] p-5 sm:p-6 rounded-2xl shadow-sm border border-stone-200 flex flex-col items-center justify-center text-center">
          <div className="flex flex-row items-center gap-3 mb-5 sm:flex-col sm:mb-4">
            <div className="w-10 h-10 sm:w-16 sm:h-16 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center shadow-inner border border-amber-200/50">
              <Clock className="w-5 h-5 sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-stone-800 tracking-tight">Attendance Management</h3>
          </div>

          {todayStatus.isHoliday ? (
            <div className="mt-4 bg-orange-50 border border-orange-200 text-orange-800 p-6 rounded-xl w-full">
              <h4 className="font-bold text-lg mb-1 flex justify-center items-center"><Calendar className="w-5 h-5 mr-2" /> Office Closed</h4>
              <p className="text-sm font-medium">{todayStatus.message}</p>
              <p className="text-xs text-orange-600/80 mt-2">Core time tracking is disabled for today.</p>
            </div>
          ) : !todayAttendance ? (
            <div className="w-full">
              {isCheckOutTimeCrossed ? (
                <div className="mt-2 p-8 bg-red-50/40 border border-dashed border-red-200 rounded-3xl">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="bg-red-100 p-3 rounded-2xl shadow-sm border border-red-200">
                      <LogOut className="w-10 h-10 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-black text-red-900 tracking-tight text-lg">Shift Ended</h4>
                      <p className="text-xs text-red-700/80 font-semibold mt-2 max-w-[260px] leading-relaxed">
                        The check-out time (<span className="text-red-900 font-bold">{formatSimpleTime(settings?.checkOutTime)}</span>) has already passed. 
                        You cannot check in for today.
                      </p>
                      <div className="mt-4 inline-flex items-center gap-2 bg-red-100/50 px-3 py-1.5 rounded-full border border-red-200">
                        <AlertCircle className="w-3 h-3 text-red-600" />
                        <span className="text-[10px] font-bold text-red-800 uppercase tracking-wider">Access Closed</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-stone-500 mb-4 font-medium select-none pointer-events-none">Standard Check-In: <span className="text-stone-800 font-bold">{formatSimpleTime(settings?.checkInTime)}</span></p>
                  <div className="w-full max-w-sm mx-auto">
                    <SlideButton text="Slide to Check In" onSlide={handleCheckIn} disabled={loading} color="primary" />
                  </div>
                </>
              )}
            </div>
          ) : todayAttendance.checkOutTime ? (
            <div className="bg-stone-200 text-stone-700 px-6 py-4 rounded-xl font-bold w-full uppercase tracking-wider text-sm shadow-inner border border-stone-300 select-none pointer-events-none">
              Checked Out at {formatTime(todayAttendance.checkOutTime)}
            </div>
          ) : (
            <div className="w-full">
              <div className={`text-sm p-3 rounded-xl border flex items-center justify-center font-bold shadow-sm select-none pointer-events-none ${
                attendanceStatus === 'PENDING_APPROVAL' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                attendanceStatus === 'LATE_REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                Checked in at {formatTime(todayAttendance.checkInTime)}
              </div>
              {attendanceStatus === 'PENDING_APPROVAL' ? (
                <div className="mt-6 p-8 bg-amber-50/50 border border-dashed border-amber-200 rounded-3xl">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="relative">
                      <Clock className="w-12 h-12 text-amber-600 animate-pulse" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white animate-bounce" />
                    </div>
                    <div>
                      <h4 className="font-black text-amber-900 tracking-tight text-lg">Wait for Admin Approval</h4>
                      <p className="text-xs text-amber-700/80 font-semibold mt-2 max-w-[260px] leading-relaxed">Your late check-in is currently under review by the supervisor.</p>
                      <div className="mt-4 inline-flex items-center gap-2 bg-amber-100/50 px-3 py-1.5 rounded-full border border-amber-200">
                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Review in progress</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : attendanceStatus === 'LATE_REJECTED' ? (
                <div className="mt-6 p-8 bg-red-50/50 border border-dashed border-red-200 rounded-3xl">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="bg-red-100 p-3 rounded-2xl shadow-sm border border-red-200">
                      <XCircle className="w-10 h-10 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-black text-red-900 tracking-tight text-lg">Check-In Rejected</h4>
                      <p className="text-xs text-red-700/80 font-semibold mt-2 max-w-[260px] leading-relaxed">Your late arrival was not approved. Please contact your administrator.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <WorkProgressBar settings={settings} todayAttendance={todayAttendance} />
                  <div className="mt-6 w-full max-w-sm mx-auto">
                    <SlideButton text="Slide to Check Out" onSlide={handleCheckOut} disabled={loading} color="dark" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Team Leaderboard — RIGHT column */}
        <div className="bg-[#FAF8F5] rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-stone-800 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-600" /> Team Leaderboard
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">Employees shown anonymously for privacy.</p>
            </div>
            {selfRank && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex-shrink-0">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-amber-600 font-bold">Your Rank</p>
                  <p className="text-base font-extrabold text-amber-700 leading-tight">#{selfRank}</p>
                </div>
                <div className="w-px h-7 bg-amber-200 mx-1" />
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-amber-600 font-bold">Score</p>
                  <p className="text-base font-extrabold text-amber-700 leading-tight">{user?.performanceScore ?? 0}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto" style={{ maxHeight: '340px' }}>
            {lbLoading ? (
              <div className="px-6 py-10 text-center text-stone-400 text-sm">Loading leaderboard...</div>
            ) : leaderboard.length === 0 ? (
              <div className="px-6 py-10 text-center text-stone-400 text-sm italic">No data yet.</div>
            ) : (
              <div className="divide-y divide-stone-100">
                {leaderboard.map((entry) => {
                  const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : null;
                  const isTop3 = entry.rank <= 3;
                  return (
                    <div
                      key={entry.rank}
                      className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                        entry.isSelf ? 'bg-amber-50/60 border-l-4 border-amber-400'
                        : isTop3 ? 'bg-stone-50/50'
                        : 'hover:bg-stone-50/30'
                      }`}
                    >
                      <div className="w-8 flex-shrink-0 flex items-center justify-center">
                        {medal
                          ? <span className="text-base">{medal}</span>
                          : <span className={`text-xs font-bold tabular-nums ${entry.isSelf ? 'text-amber-600' : 'text-stone-400'}`}>#{entry.rank}</span>
                        }
                      </div>
                      <div className="relative flex-shrink-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-extrabold ${
                          entry.isSelf
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-stone-200 text-stone-400 border border-stone-200 blur-[3px] select-none'
                        }`}>
                          {entry.name.charAt(0)}
                        </div>
                        {entry.isSelf && (
                          <span className="absolute -top-1 -right-1 text-[7px] bg-amber-500 text-white font-bold px-1 rounded-full leading-relaxed">YOU</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {entry.isSelf
                          ? <p className="text-xs font-bold text-stone-800 truncate">{entry.name}</p>
                          : <p className="text-xs font-semibold text-stone-400 blur-[4px] select-none truncate">{entry.name}</p>
                        }
                        <p className="text-[9px] text-stone-400 font-medium">{entry.isSelf ? 'You' : 'Anonymous'}</p>
                      </div>
                      <div className="flex-1 max-w-[80px] hidden sm:block">
                        <div className="w-full bg-stone-100 rounded-full h-1 overflow-hidden">
                          <div
                            className={`h-1 rounded-full ${entry.isSelf ? 'bg-amber-400' : isTop3 ? 'bg-stone-400' : 'bg-stone-300'}`}
                            style={{ width: `${Math.min(100, (entry.performanceScore / (leaderboard[0]?.performanceScore || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-xs font-extrabold tabular-nums ${entry.isSelf ? 'text-amber-700' : 'text-stone-600'}`}>{entry.performanceScore}</p>
                        <p className="text-[8px] uppercase tracking-widest text-stone-400 font-semibold">pts</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-5 py-2.5 border-t border-stone-100 bg-stone-50/50">
            <p className="text-[9px] text-stone-400 text-center italic">Names and avatars are hidden to protect privacy.</p>
          </div>
        </div>
      </div>

      {/* Analytics Chart */}
      <div className="bg-[#FAF8F5] p-6 rounded-2xl shadow-sm border border-stone-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h3 className="text-lg font-bold text-stone-800 flex items-center">
            <Activity className="w-5 h-5 text-amber-800 mr-2" /> Performance Analytics
          </h3>
          <div className="flex bg-[#EBE5D9] p-1 rounded-lg mt-4 sm:mt-0 border border-[#DFD8C9]">
            <button onClick={() => setChartFilter('weekly')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${chartFilter === 'weekly' ? 'bg-[#FCFBF8] shadow text-stone-800' : 'text-stone-600 hover:text-stone-800'}`}>Week</button>
            <button onClick={() => setChartFilter('monthly')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${chartFilter === 'monthly' ? 'bg-[#FCFBF8] shadow text-stone-800' : 'text-stone-600 hover:text-stone-800'}`}>Month</button>
            <button onClick={() => setChartFilter('yearly')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${chartFilter === 'yearly' ? 'bg-[#FCFBF8] shadow text-stone-800' : 'text-stone-600 hover:text-stone-800'}`}>Year</button>
          </div>
        </div>
        <div className="w-full h-72">
          {chartData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-stone-400 text-sm italic">
              No point events found in this timeframe. Check in daily to build your graph!
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EBE5D9" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#FAF8F5" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e7e5e4" strokeDasharray="5 5" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a8a29e' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a8a29e' }} dx={-10} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e7e5e4', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fafaf9' }}
                  labelStyle={{ fontWeight: 'bold', color: '#57534e' }}
                  itemStyle={{ color: '#78350f', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="netScore" stroke="#78350f" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Today's Snapshot — below chart */}
      <div className="bg-[#FAF8F5] p-6 rounded-2xl shadow-sm border border-stone-200">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-stone-800 tracking-tight">Today's Snapshot</h3>
            <p className="text-xs text-stone-500 mt-0.5">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="bg-[#EBE5D9] p-2 rounded-xl border border-[#DFD8C9]">
            <Zap className="w-4 h-4 text-amber-700" />
          </div>
        </div>

        {todayStatus.isHoliday ? (
          <div className="flex flex-col items-center justify-center text-center py-6 bg-orange-50/60 rounded-xl border border-orange-100">
            <Calendar className="w-8 h-8 text-orange-400 mb-2" />
            <p className="font-semibold text-orange-700 text-sm">Office Closed Today</p>
            <p className="text-xs text-orange-500 mt-1">Enjoy your time off and recharge!</p>
          </div>
        ) : todayAttendance ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Status */}
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 p-3 bg-[#FCFBF8] rounded-xl border border-stone-200">
              <div className="flex items-center gap-2">
                {attendanceStatus === 'EARLY' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
                  attendanceStatus === 'LATE' || attendanceStatus === 'LATE_REJECTED' ? <XCircle className="w-4 h-4 text-red-600" /> :
                    attendanceStatus === 'PENDING_APPROVAL' ? <AlertCircle className="w-4 h-4 text-amber-600" /> :
                      <CheckCircle2 className="w-4 h-4 text-stone-600" />}
                <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Status</span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                ${attendanceStatus === 'EARLY' ? 'bg-green-100 text-green-700' : ''}
                ${attendanceStatus === 'LATE' ? 'bg-yellow-100 text-yellow-700' : ''}
                ${attendanceStatus === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-700' : ''}
                ${attendanceStatus === 'LATE_APPROVED' ? 'bg-orange-100 text-orange-700' : ''}
                ${attendanceStatus === 'LATE_REJECTED' ? 'bg-red-100 text-red-700' : ''}
                ${attendanceStatus === 'ON_TIME' ? 'bg-stone-100 text-stone-600' : ''}
                ${attendanceStatus === 'MISSED' ? 'bg-red-600 text-white' : ''}
              `}>
                {attendanceStatus === 'LATE_APPROVED' ? 'Late · Approved' :
                  attendanceStatus === 'LATE_REJECTED' ? 'Late · Rejected' :
                    attendanceStatus === 'PENDING_APPROVAL' ? 'Pending' :
                      attendanceStatus === 'MISSED' ? 'Missed' :
                        attendanceStatus.charAt(0) + attendanceStatus.slice(1).toLowerCase()}
              </span>
            </div>

            {/* Check-in */}
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 p-3 bg-[#FCFBF8] rounded-xl border border-stone-200 select-none pointer-events-none">
              <div className="flex items-center gap-2">
                <LogIn className="w-4 h-4 text-amber-700" />
                <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">In</span>
              </div>
              <span className="text-sm font-bold text-stone-800">{formatTime(todayAttendance.checkInTime)}</span>
            </div>

            {/* Check-out */}
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 p-3 bg-[#FCFBF8] rounded-xl border border-stone-200 select-none pointer-events-none">
              <div className="flex items-center gap-2">
                <LogOut className="w-4 h-4 text-stone-400" />
                <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Out</span>
              </div>
              <span className="text-sm font-bold text-stone-800">
                {todayAttendance.checkOutTime ? formatTime(todayAttendance.checkOutTime) : '—'}
              </span>
            </div>

            {/* Points */}
            <div className={`flex flex-col xs:flex-row xs:items-center justify-between gap-2 p-3 rounded-xl border ${pointsAwarded >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
              <div className="flex items-center gap-2">
                {pointsAwarded >= 0
                  ? <TrendingUp className="w-4 h-4 text-green-500" />
                  : <TrendingDown className="w-4 h-4 text-red-500" />}
                <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Points</span>
              </div>
              <span className={`text-sm font-extrabold ${pointsAwarded >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {pointsAwarded > 0 ? '+' : ''}{pointsAwarded} pts
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-8 bg-stone-100/50 rounded-xl border border-dashed border-stone-300">
            <Clock className="w-8 h-8 text-stone-400 mb-2" />
            <p className="text-sm font-semibold text-stone-600">No Attendance Yet</p>
            <p className="text-xs text-stone-500 mt-1">Slide to check in and start tracking</p>
          </div>
        )}
      </div>
      {/* Early Check-out Modal */}
      {showEarlyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-stone-900/20">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-stone-100 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-6 mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-stone-800 text-center tracking-tight">Early Check-out?</h2>
            <p className="text-stone-500 text-sm text-center mt-3 leading-relaxed font-medium">
              You are attempting to check out before the official time (<span className="text-stone-800 font-bold">{formatSimpleTime(settings?.checkOutTime)}</span>).
              This might affect your performance score.
            </p>
            <div className="flex flex-col gap-3 mt-8">
              <button
                onClick={() => handleCheckOut(true)}
                disabled={loading}
                className="w-full px-4 py-3 rounded-2xl bg-stone-800 text-white font-bold text-sm hover:bg-stone-900 shadow-lg shadow-stone-200 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Confirm Early Check-out'}
              </button>
              <button
                onClick={() => setShowEarlyModal(false)}
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
