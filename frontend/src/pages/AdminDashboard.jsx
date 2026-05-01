import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { toast } from 'sonner';
import {
  Users, AlertCircle, CalendarCheck, Trophy, TrendingUp, TrendingDown,
  BarChart2, X, Mail, Star, Calendar, Search, ChevronLeft, ChevronRight,
  MessageSquarePlus, Image as ImageIcon
} from 'lucide-react';

/* ─── Stat Card ─────────────────────────────────────────────── */
const StatCard = ({ title, value, icon: Icon, colorClass, bgColor }) => (
  <div className={`${bgColor} p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center`}>
    <div className={`p-4 rounded-xl mr-4 ${colorClass}`}>
      {Icon && <Icon className="w-6 h-6" />}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
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
        {initials}
        <span className="absolute -bottom-1 -right-1 text-base leading-none">{cfg.label}</span>
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
            <p className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">Check-ins</p>
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
const EmployeeModal = ({ employee, onClose }) => {
  if (!employee) return null;
  const initials = employee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-3xl p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 p-1.5 rounded-full transition-all"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-extrabold ring-2 ring-white/50">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-bold">{employee.name}</h2>
              <p className="text-indigo-200 text-sm">Rank #{employee.rank}</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="font-semibold text-gray-800">{employee.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center bg-indigo-50 p-3 rounded-xl border border-indigo-100">
              <p className="text-2xl font-extrabold text-indigo-600">{employee.performanceScore}</p>
              <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1"><Star className="w-3 h-3 text-yellow-400" /> Score</p>
            </div>
            <div className="text-center bg-green-50 p-3 rounded-xl border border-green-100">
              <p className="text-2xl font-extrabold text-green-600">{employee.totalAttendance}</p>
              <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1"><Calendar className="w-3 h-3 text-green-400" /> Days</p>
            </div>
            <div className="text-center bg-purple-50 p-3 rounded-xl border border-purple-100">
              <p className={`text-2xl font-extrabold ${employee.trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {employee.trend >= 0 ? '+' : ''}{employee.trend}
              </p>
              <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
                {employee.trend >= 0 ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-red-400" />}
                7d Trend
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Feedback Modal ─────────────────────────────────────────── */
const FeedbackModal = ({ employeeId, onClose }) => {
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackPoints, setFeedbackPoints] = useState('');
  const [feedbackImage, setFeedbackImage] = useState(null);
  const [loading, setLoading] = useState(false);

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
              <label className="w-full px-3 py-3 bg-gray-50 border border-gray-200 border-dashed rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors overflow-hidden">
                <ImageIcon className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-500 font-medium truncate">
                  {feedbackImage ? feedbackImage.name : 'Choose File'}
                </span>
                <input type="file" accept="image/*" onChange={e => setFeedbackImage(e.target.files[0])} className="hidden" />
              </label>
            </div>
          </div>
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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/admin/dashboard');
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch admin stats', error);
      }
    };
    fetchStats();
  }, []);

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
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Admin Overview</h1>
          <p className="text-gray-500 text-sm mt-1">Live workforce performance at a glance.</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Employees" value={stats.totalEmployees} icon={Users} colorClass="bg-blue-100 text-blue-600" bgColor="bg-blue-50" />
          <StatCard title="Groups" value={stats.totalGroups} icon={Users} colorClass="bg-purple-100 text-purple-600" bgColor="bg-purple-50" />
          <StatCard title="Pending Approvals" value={stats.pendingApprovals} icon={AlertCircle} colorClass="bg-red-100 text-red-600" bgColor="bg-red-50" />
          <StatCard title="Today's Check-ins" value={stats.todayAttendances} icon={CalendarCheck} colorClass="bg-green-100 text-green-600" bgColor="bg-green-50" />
        </div>

        {/* Podium — Top 3 */}
        {stats.topPerformers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-13">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <h2 className="text-xl font-extrabold text-gray-900">Top Performers</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-stretch">
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

            {/* Table */}
            <div className="overflow-x-auto">
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
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold shadow-sm
                              ${isTop3 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                              {initials}
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
      {feedbackFor && <FeedbackModal employeeId={feedbackFor} onClose={() => setFeedbackFor(null)} />}
    </>
  );
};

export default AdminDashboard;
