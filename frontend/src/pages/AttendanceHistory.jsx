import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../services/api';
import { formatDate, formatTime } from '../utils/formatDate';
import {
  Calendar, ChevronLeft, ChevronRight, Clock, LogIn, LogOut,
  TrendingUp, TrendingDown, Filter, X, History
} from 'lucide-react';

/* ── Custom Date Picker Button ── */
const fmt = (iso) =>
  iso
    ? new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

const DatePickerBtn = ({ value, onChange, placeholder, min }) => {
  const ref = useRef(null);
  return (
    <div
      className="relative flex-1 cursor-pointer"
      onClick={() => ref.current?.showPicker?.() || ref.current?.click()}
    >
      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none z-10" />
      {/* Styled display */}
      <div className={`w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm select-none ${
        value ? 'text-stone-800 font-semibold' : 'text-stone-400'
      }`}>
        {value ? fmt(value) : placeholder}
      </div>
      {/* Hidden native input — positioned exactly over the display */}
      <input
        ref={ref}
        type="date"
        value={value}
        min={min}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        tabIndex={-1}
      />
    </div>
  );
};

/* ── helpers ── */
const STATUS_CONFIG = {
  EARLY:            { label: 'Early',           bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  ON_TIME:          { label: 'On Time',          bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200'    },
  LATE:             { label: 'Late',             bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200'   },
  PENDING_APPROVAL: { label: 'Pending',          bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200'  },
  LATE_APPROVED:    { label: 'Late · Approved',  bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200'    },
  LATE_REJECTED:    { label: 'Rejected',         bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200'     },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
};

const FILTERS = [
  { key: 'ALL',          label: 'All' },
  { key: 'EARLY',        label: 'Early' },
  { key: 'ON_TIME',      label: 'On Time' },
  { key: 'LATE',         label: 'Late' },
  { key: 'LATE_APPROVED',label: 'Approved' },
  { key: 'LATE_REJECTED',label: 'Rejected' },
  { key: 'PENDING_APPROVAL', label: 'Pending' },
];

const PAGE_SIZE = 7;

const AttendanceHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/attendance/me');
        // Sort descending by date
        const sorted = [...(Array.isArray(data) ? data : [])].sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );
        setHistory(sorted);
      } catch (err) {
        console.error('Failed to fetch attendance history', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [statusFilter, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    return history.filter(r => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      return true;
    });
  }, [history, statusFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalPoints = filtered.reduce((s, r) => s + Number(r.pointsAwarded || 0), 0);
  const hasFilters = statusFilter !== 'ALL' || dateFrom || dateTo;

  const clearFilters = () => {
    setStatusFilter('ALL');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="space-y-5 pb-10">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-800 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-amber-600" /> Attendance History
          </h1>
          <p className="text-sm text-stone-400 mt-0.5">Your full check-in / check-out log with status and points.</p>
        </div>
        {/* Summary chips */}
        {!loading && (
          <div className="flex items-center gap-3 text-xs text-stone-500">
            <span className="bg-stone-100 border border-stone-200 rounded-lg px-3 py-1.5 font-semibold text-stone-700">
              {filtered.length} records
            </span>
            <span className={`rounded-lg px-3 py-1.5 font-bold border ${totalPoints >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {totalPoints > 0 ? '+' : ''}{totalPoints} pts
            </span>
          </div>
        )}
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-[#FAF8F5] rounded-2xl border border-stone-200 shadow-sm p-4 space-y-3">
        {/* Status filter pills */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                statusFilter === f.key
                  ? 'bg-stone-800 text-white border-stone-800 shadow-sm'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
              }`}
            >
              {f.label}
            </button>
          ))}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 transition-colors font-medium"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Date range */}
        <div className="flex flex-row items-center gap-2">
          <DatePickerBtn
            value={dateFrom}
            onChange={setDateFrom}
            placeholder="From"
          />
          <span className="text-stone-300 text-sm flex-shrink-0">→</span>
          <DatePickerBtn
            value={dateTo}
            onChange={setDateTo}
            placeholder="To"
            min={dateFrom || undefined}
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-[#FAF8F5] rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-stone-400 font-medium">Loading records...</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full whitespace-nowrap text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-left">Day</th>
                    <th className="px-6 py-3 text-left">Check In</th>
                    <th className="px-6 py-3 text-left">Check Out</th>
                    <th className="px-6 py-3 text-left">Duration</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-20 text-center">
                        <Calendar className="w-10 h-10 text-stone-200 mx-auto mb-3" />
                        <p className="text-sm text-stone-400 font-medium">No records match the selected filters.</p>
                        {hasFilters && (
                          <button onClick={clearFilters} className="mt-3 text-xs text-amber-600 hover:text-amber-700 font-semibold underline">
                            Clear filters
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : paged.map((record) => {
                    const pts = Number(record.pointsAwarded || 0);
                    // Compute duration
                    let duration = '—';
                    if (record.checkInTime && record.checkOutTime) {
                      const cin = new Date(record.checkInTime);
                      const cout = new Date(record.checkOutTime);
                      const mins = Math.round((cout - cin) / 60000);
                      if (mins > 0) {
                        const h = Math.floor(mins / 60);
                        const m = mins % 60;
                        duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
                      }
                    }
                    const dateObj = record.date ? new Date(record.date + 'T00:00:00') : null;
                    const dayName = dateObj
                      ? dateObj.toLocaleDateString('en-US', { weekday: 'short' })
                      : '—';
                    const isToday = record.date === new Date().toISOString().split('T')[0];

                    return (
                      <tr key={record._id} className="hover:bg-stone-50/60 transition-colors group">
                        {/* Date */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {isToday && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                            )}
                            <span className="font-semibold text-stone-800">{formatDate(record.date)}</span>
                          </div>
                        </td>

                        {/* Day */}
                        <td className="px-6 py-4 text-stone-400 font-medium">{dayName}</td>

                        {/* Check In */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-stone-700">
                            <LogIn className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                            <span className="font-medium">{formatTime(record.checkInTime)}</span>
                          </div>
                        </td>

                        {/* Check Out */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-stone-500">
                            <LogOut className="w-3.5 h-3.5 text-stone-300 flex-shrink-0" />
                            <span className={record.checkOutTime ? 'font-medium text-stone-700' : 'text-stone-300 italic'}>
                              {record.checkOutTime ? formatTime(record.checkOutTime) : 'Not yet'}
                            </span>
                          </div>
                        </td>

                        {/* Duration */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-stone-500">
                            <Clock className="w-3.5 h-3.5 text-stone-300 flex-shrink-0" />
                            <span className="font-medium text-stone-600">{duration}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <StatusBadge status={record.status} />
                        </td>

                        {/* Points */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {pts > 0
                              ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                              : pts < 0
                              ? <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                              : null
                            }
                            <span className={`font-extrabold tabular-nums text-sm ${pts > 0 ? 'text-emerald-600' : pts < 0 ? 'text-red-500' : 'text-stone-400'}`}>
                              {pts > 0 ? '+' : ''}{pts}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-stone-100">
              {paged.length === 0 ? (
                <div className="px-6 py-20 text-center">
                  <Calendar className="w-10 h-10 text-stone-200 mx-auto mb-3" />
                  <p className="text-sm text-stone-400 font-medium">No records match the selected filters.</p>
                </div>
              ) : (
                paged.map((record) => {
                  const pts = Number(record.pointsAwarded || 0);
                  const isToday = record.date === new Date().toISOString().split('T')[0];
                  
                  let duration = '—';
                  if (record.checkInTime && record.checkOutTime) {
                    const cin = new Date(record.checkInTime);
                    const cout = new Date(record.checkOutTime);
                    const mins = Math.round((cout - cin) / 60000);
                    if (mins > 0) {
                      const h = Math.floor(mins / 60);
                      const m = mins % 60;
                      duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
                    }
                  }

                  const dateObj = record.date ? new Date(record.date + 'T00:00:00') : null;
                  const dayName = dateObj ? dateObj.toLocaleDateString('en-US', { weekday: 'long' }) : '—';

                  return (
                    <div key={record._id} className="p-4 bg-white hover:bg-stone-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {isToday && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                          <span className="font-bold text-stone-800">{formatDate(record.date)}</span>
                          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">({dayName})</span>
                        </div>
                        <StatusBadge status={record.status} />
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
                        <div className="space-y-1">
                          <p className="text-[9px] uppercase font-bold text-stone-400 tracking-widest">Check In</p>
                          <div className="flex items-center gap-1.5">
                            <LogIn className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-sm font-bold text-stone-700">{formatTime(record.checkInTime)}</span>
                          </div>
                        </div>
                        <div className="space-y-1 border-l border-stone-200 pl-4">
                          <p className="text-[9px] uppercase font-bold text-stone-400 tracking-widest">Check Out</p>
                          <div className="flex items-center gap-1.5">
                            <LogOut className="w-3.5 h-3.5 text-stone-300" />
                            <span className={`text-sm font-bold ${record.checkOutTime ? 'text-stone-700' : 'text-stone-400 italic'}`}>
                              {record.checkOutTime ? formatTime(record.checkOutTime) : 'Not yet'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-stone-300" />
                          <span className="text-xs font-semibold text-stone-500">Duration: <span className="text-stone-700">{duration}</span></span>
                        </div>
                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border ${pts >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                          {pts > 0 ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : pts < 0 ? <TrendingDown className="w-3 h-3 text-red-400" /> : null}
                          <span className={`text-xs font-black tabular-nums ${pts > 0 ? 'text-emerald-700' : pts < 0 ? 'text-red-600' : 'text-stone-400'}`}>
                            {pts > 0 ? '+' : ''}{pts} {pts !== 0 && 'pts'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 || filtered.length > 0 ? (
              <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-stone-400 font-medium">
                  Showing{' '}
                  <span className="font-bold text-stone-700">{Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}</span>
                  {' '}–{' '}
                  <span className="font-bold text-stone-700">{Math.min(page * PAGE_SIZE, filtered.length)}</span>
                  {' '}of{' '}
                  <span className="font-bold text-stone-700">{filtered.length}</span>{' '}records
                  {hasFilters && <span className="text-amber-500"> (filtered)</span>}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 border border-stone-200 rounded-lg bg-white text-stone-500 disabled:opacity-30 hover:bg-stone-50 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, i) => {
                      const pg = i + 1;
                      // Show window: first, last, current ±1
                      const show = pg === 1 || pg === totalPages || Math.abs(pg - page) <= 1;
                      const showEllipsisBefore = pg === page - 2 && page - 2 > 1;
                      const showEllipsisAfter = pg === page + 2 && page + 2 < totalPages;
                      if (!show && !showEllipsisBefore && !showEllipsisAfter) return null;
                      if (showEllipsisBefore || showEllipsisAfter) {
                        return <span key={`e-${i}`} className="text-stone-300 text-xs px-1">…</span>;
                      }
                      return (
                        <button
                          key={pg}
                          onClick={() => setPage(pg)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                            page === pg
                              ? 'bg-stone-800 text-white shadow-sm'
                              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                          }`}
                        >
                          {pg}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 border border-stone-200 rounded-lg bg-white text-stone-500 disabled:opacity-30 hover:bg-stone-50 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default AttendanceHistory;
