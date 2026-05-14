import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import api from '../services/api';
import { toast } from 'sonner';
import { useSocket } from '../context/SocketContext';
import {
  Users, AlertCircle, CalendarCheck, Trophy, TrendingUp, TrendingDown,
  BarChart2, X, Mail, Star, Calendar, Search, ChevronLeft, ChevronRight,
  MessageSquarePlus, Image as ImageIcon, RotateCw, LayoutDashboard
} from 'lucide-react';

/* ─── Stat Card ─────────────────────────────────────────────── */
const StatCard = ({ title, value, icon: Icon, colorClass, bgColor }) => (
  <div className={`${bgColor} p-3 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 sm:gap-4`}>
    <div className={`p-2 sm:p-4 rounded-xl ${colorClass} shrink-0`}>
      {Icon && <Icon className="w-4 h-4 sm:w-6 sm:h-6" />}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] sm:text-sm font-bold sm:font-medium text-gray-500 uppercase tracking-wider sm:normal-case sm:tracking-normal truncate">{title}</p>
      <p className="text-lg sm:text-2xl font-black sm:font-bold text-gray-900 tabular-nums leading-tight">{value}</p>
    </div>
  </div>
);

/* ─── Podium Config ───────────────────────────────────────────── */
const PODIUM_CONFIG = {
  0: { label: '🥇', rank: '1st', border: 'border-yellow-400', ring: 'ring-yellow-400', rankText: 'text-yellow-600', dot: 'bg-yellow-400', chipBg: 'bg-yellow-50', chipText: 'text-yellow-700', chipBorder: 'border-yellow-200' },
  1: { label: '🥈', rank: '2nd', border: 'border-slate-400', ring: 'ring-slate-400', rankText: 'text-slate-500', dot: 'bg-slate-400', chipBg: 'bg-slate-50', chipText: 'text-slate-600', chipBorder: 'border-slate-200' },
  2: { label: '🥉', rank: '3rd', border: 'border-orange-400', ring: 'ring-orange-400', rankText: 'text-orange-600', dot: 'bg-orange-400', chipBg: 'bg-orange-50', chipText: 'text-orange-700', chipBorder: 'border-orange-200' },
};

const PodiumCard = ({ user, index, onViewDetails }) => {
  const cfg = PODIUM_CONFIG[index];
  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className={`relative rounded-2xl overflow-visible shadow-md border-2 ${cfg.border} bg-white`}>
      <div className={`absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full ring-2 ${cfg.ring} ring-offset-2 ring-offset-white flex items-center justify-center shadow-lg text-base font-extrabold bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 z-10`}>
        <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
          {user.profilePicture ? (
            <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <span className="absolute -bottom-1 -right-1 text-base leading-none z-20">{cfg.label}</span>
      </div>
      <div className="pt-10 pb-4 px-4 flex flex-col items-center text-center">
        <span className={`text-[10px] font-extrabold uppercase tracking-widest ${cfg.rankText}`}>{cfg.rank} Place</span>
        <h3 className="text-sm font-extrabold text-gray-900 mt-0.5 leading-tight">{user.name}</h3>
        <p className="text-[11px] text-gray-400 truncate max-w-[160px]">{user.email}</p>
        <div className={`w-8 h-0.5 ${cfg.dot} rounded-full my-3`} />
        <div className="flex gap-2 w-full justify-center mb-3">
          <div className={`flex-1 ${cfg.chipBg} border ${cfg.chipBorder} rounded-xl py-2 text-center`}>
            <p className={`text-lg font-extrabold ${cfg.chipText} tabular-nums leading-tight`}>{user.performanceScore}</p>
            <p className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">Points</p>
          </div>
          <div className={`flex-1 ${cfg.chipBg} border ${cfg.chipBorder} rounded-xl py-2 text-center`}>
            <p className={`text-lg font-extrabold ${cfg.chipText} tabular-nums leading-tight`}>{user.totalAttendance}</p>
            <p className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">Days</p>
          </div>
        </div>
        <div className="flex items-center justify-between w-full gap-2">
          <div className="flex items-center gap-1">
            {user.trend >= 0
              ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              : <TrendingDown className="w-3.5 h-3.5 text-red-500 shrink-0" />
            }
            <span className={`text-[11px] font-bold ${user.trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {user.trend >= 0 ? '+' : ''}{user.trend} pts (7d)
            </span>
          </div>
          <button
            onClick={() => onViewDetails(user)}
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border ${cfg.chipBorder} ${cfg.chipBg} ${cfg.chipText} hover:opacity-80 transition-opacity`}
          >
            <BarChart2 className="w-3 h-3" /> Stats
          </button>
        </div>
      </div>
    </div>
  );
};


/* ─── Employee Detail Modal ──────────────────────────────────── */
/* ─── Employee Detail Modal ──────────────────────────────────── */
const EmployeeModal = ({ employee, onClose }) => {
  if (!employee) return null;
  const initials = employee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-gray-900/20">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-lg font-extrabold text-indigo-600 border border-indigo-100 overflow-hidden">
              {employee.profilePicture ? (
                <img src={employee.profilePicture} alt={employee.name} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{employee.name}</h2>
              <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider">Rank #{employee.rank}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 ml-1">Employee Details</label>
            <div className="flex items-center gap-3 bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                <Mail className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">{employee.email}</p>
                <p className="text-[11px] text-gray-500 font-medium">Registered Account</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 ml-1">Performance Overview</label>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
                <p className="text-2xl font-black text-indigo-600 tabular-nums leading-none">{employee.performanceScore}</p>
                <p className="text-[10px] font-bold text-indigo-400 uppercase mt-2 flex items-center justify-center gap-1">
                  <Star className="w-3 h-3" /> Score
                </p>
              </div>
              <div className="text-center bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                <p className="text-2xl font-black text-emerald-600 tabular-nums leading-none">{employee.totalAttendance}</p>
                <p className="text-[10px] font-bold text-emerald-400 uppercase mt-2 flex items-center justify-center gap-1">
                  <Calendar className="w-3 h-3" /> Days
                </p>
              </div>
              <div className="text-center bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50">
                <p className={`text-2xl font-black tabular-nums leading-none ${employee.trend >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {employee.trend >= 0 ? '+' : ''}{employee.trend}
                </p>
                <p className="text-[10px] font-bold text-amber-500 uppercase mt-2 flex items-center justify-center gap-1">
                  {employee.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  Trend
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="mt-8">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Feedback Modal ─────────────────────────────────────────── */
const FeedbackModal = ({ employeeId, onClose, onSuccess }) => {
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackPoints, setFeedbackPoints] = useState('');
  const [feedbackImage, setFeedbackImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) return toast.error('Feedback text is required');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('text', feedbackText);
      formData.append('points', feedbackPoints || 0);
      if (feedbackImage) formData.append('image', feedbackImage);
      await api.post(`/admin/users/${employeeId}/feedback`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Feedback submitted and employee notified');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-gray-900/20">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Provide Feedback</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Feedback Message *</label>
            <textarea
              required
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none h-24"
              placeholder="Great job this month... OR Needs improvement on..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Points (+/-)</label>
              <input
                type="number"
                value={feedbackPoints}
                onChange={e => setFeedbackPoints(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                placeholder="e.g. 10 or -5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Attach Image</label>
              <div className="flex gap-2">
                <label className={`flex-1 px-3 py-3 bg-gray-50 border border-gray-200 border-dashed rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors overflow-hidden ${feedbackImage ? 'ring-2 ring-indigo-500/20 border-indigo-500' : ''}`}>
                  <ImageIcon className={`w-4 h-4 mr-2 ${feedbackImage ? 'text-indigo-500' : 'text-gray-400'} flex-shrink-0`} />
                  <span className={`text-xs text-gray-500 font-medium truncate ${feedbackImage ? 'text-indigo-700' : 'text-gray-500'}`}>
                    {feedbackImage ? feedbackImage.name : 'Choose File'}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={e => setFeedbackImage(e.target.files[0])}
                    className="hidden"
                  />
                </label>
                {feedbackImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setFeedbackImage(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="p-3 bg-red-50 text-red-500 border border-red-100 rounded-xl hover:bg-red-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Image Preview */}
          {feedbackImage && (
            <div className="relative rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 aspect-video group">
              <img
                src={URL.createObjectURL(feedbackImage)}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <p className="text-white text-[10px] font-bold uppercase tracking-widest">Image Preview</p>
              </div>
            </div>
          )}
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Main Dashboard ─────────────────────────────────────────── */
const ITEMS_PER_PAGE = 10;

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [feedbackFor, setFeedbackFor] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const t = Date.now();
      const { data } = await api.get(`/admin/dashboard?t=${t}`);
      setStats(data);
      if (isManual) toast.success('Dashboard data synchronized');
    } catch (error) {
      console.error('Failed to fetch admin stats', error);
      if (isManual) toast.error('Failed to sync data');
    } finally {
      if (isManual) setRefreshing(false);
    }
  }, []);

  const { socket } = useSocket();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchStats();
    };

    socket.on('admin:dashboard-update', handleUpdate);

    return () => {
      socket.off('admin:dashboard-update', handleUpdate);
    };
  }, [socket, fetchStats]);

  const filteredLeaderboard = useMemo(() => {
    if (!stats) return [];
    const q = search.toLowerCase().trim();
    if (!q) return stats.leaderboard;
    return stats.leaderboard.filter(e =>
      e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q)
    );
  }, [stats, search]);

  const totalPages = Math.max(1, Math.ceil(filteredLeaderboard.length / ITEMS_PER_PAGE));
  const pagedLeaderboard = filteredLeaderboard.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search]);

  if (!stats) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm font-medium">Loading dashboard...</p>
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-8 pb-10">
        {/* Page Title */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 bg-white border border-indigo-100 rounded-xl sm:rounded-2xl shadow-sm shrink-0">
              <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight truncate">Admin Overview</h1>
              <p className="hidden sm:block text-gray-500 text-sm mt-1">Live workforce performance at a glance.</p>
            </div>
          </div>
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="flex items-center justify-center p-2.5 sm:px-4 sm:py-2.5 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all active:scale-95 shadow-sm disabled:opacity-50 group shrink-0"
          >
            <RotateCw className={`w-4 h-4 text-indigo-500 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            <span className="hidden sm:inline ml-2">{refreshing ? 'Syncing...' : 'Refresh Data'}</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard title="Employees" value={stats.totalEmployees} icon={Users} colorClass="bg-blue-100 text-blue-600" bgColor="bg-blue-50" />
          <StatCard title="Groups" value={stats.totalGroups} icon={Users} colorClass="bg-purple-100 text-purple-600" bgColor="bg-purple-50" />
          <StatCard title="Pending" value={stats.pendingApprovals} icon={AlertCircle} colorClass="bg-red-100 text-red-600" bgColor="bg-red-50" />
          <StatCard title="Check-ins" value={stats.todayAttendances} icon={CalendarCheck} colorClass="bg-green-100 text-green-600" bgColor="bg-green-50" />
        </div>

        {/* Podium — Top 3 */}
        {stats.topPerformers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-13">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <h2 className="text-xl font-extrabold text-gray-900">Top Performers</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-14 sm:gap-6 items-stretch mt-8 sm:mt-0">
              {stats.topPerformers[0] && <PodiumCard user={stats.topPerformers[0]} index={0} onViewDetails={setSelectedEmployee} />}
              {stats.topPerformers[1] && <PodiumCard user={stats.topPerformers[1]} index={1} onViewDetails={setSelectedEmployee} />}
              {stats.topPerformers[2] && <PodiumCard user={stats.topPerformers[2]} index={2} onViewDetails={setSelectedEmployee} />}
            </div>
          </div>
        )}

        {/* Full Leaderboard */}
        {stats.leaderboard.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-extrabold text-gray-900">Full Leaderboard</h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full font-medium">Live Rankings</span>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none text-sm transition-all"
                />
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full whitespace-nowrap text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 text-xs uppercase tracking-wider">
                    <th className="px-6 py-3 text-left font-semibold">Rank</th>
                    <th className="px-6 py-3 text-left font-semibold">Employee</th>
                    <th className="px-6 py-3 text-right font-semibold">Score</th>
                    <th className="px-6 py-3 text-right font-semibold">Days</th>
                    <th className="px-6 py-3 text-right font-semibold">7d Trend</th>
                    <th className="px-6 py-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pagedLeaderboard.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-16 text-center text-gray-400">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="font-medium">No employees match your search</p>
                      </td>
                    </tr>
                  ) : pagedLeaderboard.map((emp) => {
                    const initials = emp.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                    const isTop3 = emp.rank <= 3;
                    const medalMap = { 1: '🥇', 2: '🥈', 3: '🥉' };

                    return (
                      <tr
                        key={emp._id}
                        className={`group hover:bg-indigo-50/40 transition-colors duration-150 ${isTop3 ? 'bg-amber-50/30' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <span className={`w-8 h-8 inline-flex items-center justify-center rounded-full text-xs font-extrabold
                            ${emp.rank === 1 ? 'bg-yellow-100 text-yellow-700' : emp.rank === 2 ? 'bg-slate-100 text-slate-600' : emp.rank === 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                            {medalMap[emp.rank] ?? `#${emp.rank}`}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold shadow-sm overflow-hidden
                              ${isTop3 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                              {emp.profilePicture ? (
                                <img src={emp.profilePicture} alt={emp.name} className="w-full h-full object-cover" />
                              ) : (
                                initials
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-gray-800 group-hover:text-indigo-700 transition-colors">{emp.name}</p>
                              <p className="text-xs text-gray-400 truncate max-w-[160px]">{emp.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <span className="font-extrabold text-gray-900 tabular-nums">{emp.performanceScore}</span>
                          <span className="text-xs text-gray-400 ml-1">pts</span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-gray-700 tabular-nums">{emp.totalAttendance}</span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {emp.trend > 0 ? (
                              <TrendingUp className="w-4 h-4 text-emerald-500" />
                            ) : emp.trend < 0 ? (
                              <TrendingDown className="w-4 h-4 text-red-500" />
                            ) : (
                              <span className="w-4 h-4 text-gray-400 text-xs flex items-center justify-center">–</span>
                            )}
                            <span className={`font-bold tabular-nums text-sm
                              ${emp.trend > 0 ? 'text-emerald-600' : emp.trend < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                              {emp.trend > 0 ? '+' : ''}{emp.trend}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSelectedEmployee(emp)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all border border-indigo-100 hover:border-indigo-200"
                            >
                              <BarChart2 className="w-3.5 h-3.5" /> Stats
                            </button>
                            <button
                              onClick={() => setFeedbackFor(emp._id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all border border-blue-100 hover:border-blue-200"
                            >
                              <MessageSquarePlus className="w-3.5 h-3.5" /> Feedback
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-50">
              {pagedLeaderboard.length === 0 ? (
                <div className="px-6 py-16 text-center text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="font-medium">No employees match your search</p>
                </div>
              ) : pagedLeaderboard.map((emp) => {
                const initials = emp.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div key={emp._id} className="p-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 overflow-hidden">
                          {emp.profilePicture ? <img src={emp.profilePicture} className="w-full h-full object-cover" /> : initials}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm leading-tight">{emp.name}</p>
                          <p className="text-[11px] text-gray-500 font-medium">Rank #{emp.rank}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-indigo-600 tabular-nums">{emp.performanceScore} pts</p>
                        <div className={`flex items-center justify-end gap-1 text-[10px] font-bold ${emp.trend > 0 ? 'text-emerald-500' : emp.trend < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          {emp.trend > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : emp.trend < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : null}
                          {emp.trend > 0 ? '+' : ''}{emp.trend}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelectedEmployee(emp)} className="flex-1 py-2 bg-indigo-50 text-indigo-600 text-[11px] font-bold rounded-xl border border-indigo-100 flex items-center justify-center gap-1.5">
                        <BarChart2 className="w-3.5 h-3.5" /> Stats
                      </button>
                      <button onClick={() => setFeedbackFor(emp._id)} className="flex-1 py-2 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-xl border border-blue-100 flex items-center justify-center gap-1.5">
                        <MessageSquarePlus className="w-3.5 h-3.5" /> Feedback
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Footer */}
            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500 font-medium">
                Showing <span className="text-gray-900 font-bold">{pagedLeaderboard.length}</span> of{' '}
                <span className="text-gray-900 font-bold">{filteredLeaderboard.length}</span> employees
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-gray-200 rounded-xl bg-white text-gray-600 disabled:opacity-30 transition-all hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1 px-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={`w-8 h-8 rounded-xl text-[11px] font-bold transition-all ${page === i + 1
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 border border-gray-200 rounded-xl bg-white text-gray-600 disabled:opacity-30 transition-all hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <EmployeeModal employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />
      {feedbackFor && (
        <FeedbackModal
          employeeId={feedbackFor}
          onClose={() => setFeedbackFor(null)}
          onSuccess={fetchStats}
        />
      )}
    </>
  );
};

export default AdminDashboard;
