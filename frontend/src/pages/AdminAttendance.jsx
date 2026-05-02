import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../services/api';
import { formatDate, formatTime } from '../utils/formatDate';
import {
  Calendar, ChevronLeft, ChevronRight, Clock, LogIn, LogOut,
  TrendingUp, TrendingDown, Filter, X, History, Search, Users, ChevronDown
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
      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none z-10" />
      <div className={`w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm select-none ${value ? 'text-gray-800 font-semibold' : 'text-gray-400'}`}>
        {value ? fmt(value) : placeholder}
      </div>
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

const STATUS_CONFIG = {
  EARLY: { label: 'Early', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  ON_TIME: { label: 'On Time', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  LATE: { label: 'Late', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  PENDING_APPROVAL: { label: 'Pending', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  LATE_APPROVED: { label: 'Late · Approved', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  LATE_REJECTED: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
};

const STATUS_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'EARLY', label: 'Early' },
  { key: 'ON_TIME', label: 'On Time' },
  { key: 'LATE', label: 'Late' },
  { key: 'LATE_APPROVED', label: 'Approved' },
  { key: 'LATE_REJECTED', label: 'Rejected' },
  { key: 'PENDING_APPROVAL', label: 'Pending' },
];

const calcDuration = (cin, cout) => {
  if (!cin || !cout) return '—';
  const mins = Math.round((new Date(cout) - new Date(cin)) / 60000);
  if (mins <= 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const PAGE_SIZE = 10;

const AdminAttendance = () => {
  // Employee list
  const [employees, setEmployees] = useState([]);
  const [empSearch, setEmpSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [empLoading, setEmpLoading] = useState(true);

  // Attendance records
  const [records, setRecords] = useState([]);
  const [recLoading, setRecLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  // Fetch all employees once
  useEffect(() => {
    const load = async () => {
      setEmpLoading(true);
      try {
        const { data } = await api.get('/admin/users', { params: { limit: 200 } });
        const emps = (data.users || []).filter(u => u.role === 'EMPLOYEE');
        setEmployees(emps);
        if (emps.length > 0) setSelectedEmp(emps[0]);
      } catch (e) {
        console.error(e);
      } finally {
        setEmpLoading(false);
      }
    };
    load();
  }, []);

  // Fetch attendance when selected employee changes
  useEffect(() => {
    if (!selectedEmp) return;
    const load = async () => {
      setRecLoading(true);
      try {
        const { data } = await api.get(`/admin/users/${selectedEmp._id}/attendance`, {
          params: { limit: 500 }
        });
        const sorted = [...(data.records || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
        setRecords(sorted);
      } catch (e) {
        console.error(e);
      } finally {
        setRecLoading(false);
      }
    };
    load();
    setStatusFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }, [selectedEmp]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [statusFilter, dateFrom, dateTo]);

  const filteredEmps = useMemo(() =>
    employees.filter(e =>
      e.name.toLowerCase().includes(empSearch.toLowerCase()) ||
      e.email.toLowerCase().includes(empSearch.toLowerCase())
    ), [employees, empSearch]);

  const filteredRecs = useMemo(() =>
    records.filter(r => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      return true;
    }), [records, statusFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredRecs.length / PAGE_SIZE));
  const paged = filteredRecs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPoints = filteredRecs.reduce((s, r) => s + Number(r.pointsAwarded || 0), 0);
  const hasFilters = statusFilter !== 'ALL' || dateFrom || dateTo;

  const clearFilters = () => { setStatusFilter('ALL'); setDateFrom(''); setDateTo(''); };

  return (
    <div className="flex flex-col lg:flex-row gap-6" style={{ height: 'auto', minHeight: 'calc(100vh - 8rem)' }}>
      {/* ── Employee Sidebar (Desktop) ── */}
      <div className="hidden lg:flex w-72 flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm flex-col overflow-hidden sticky top-0" style={{ height: 'calc(100vh - 8rem)' }}>
        <div className="px-4 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" /> Employees
          </h2>
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={empSearch}
              onChange={e => setEmpSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 py-2">
          {empLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="mx-3 my-1.5 h-10 animate-pulse bg-gray-100 rounded-xl" />
            ))
          ) : filteredEmps.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-8">No employees found</p>
          ) : filteredEmps.map(emp => (
            <button
              key={emp._id}
              onClick={() => setSelectedEmp(emp)}
              className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-all ${selectedEmp?._id === emp._id
                  ? 'bg-indigo-50 border-r-2 border-indigo-600'
                  : 'hover:bg-gray-50'
                }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden ${selectedEmp?._id === emp._id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                {emp.profilePicture ? (
                  <img src={emp.profilePicture} alt={emp.name} className="w-full h-full object-cover" />
                ) : (
                  emp.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-semibold truncate ${selectedEmp?._id === emp._id ? 'text-indigo-700' : 'text-gray-800'}`}>
                  {emp.name}
                </p>
                <p className="text-[10px] text-gray-400 truncate">{emp.email}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Employee Selector (Mobile) ── */}
      <div className="lg:hidden w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
        <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Select Employee</label>
        <div className="relative">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none" />
          <select 
            className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] font-bold text-gray-700 appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={selectedEmp?._id || ''}
            onChange={(e) => setSelectedEmp(employees.find(emp => emp._id === e.target.value))}
          >
            {employees.map(emp => (
              <option key={emp._id} value={emp._id} className="text-sm py-1">{emp.name} — {emp.email}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
             <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ── Main Panel ── */}
      <div className="flex-1 min-w-0 overflow-y-auto pr-1 space-y-5 pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
              {selectedEmp?.profilePicture ? (
                <img src={selectedEmp.profilePicture} alt={selectedEmp.name} className="w-full h-full object-cover" />
              ) : (
                <History className="w-4 h-4 text-indigo-500" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-gray-800 tracking-tight truncate">
                {selectedEmp ? `${selectedEmp.name}'s Logs` : 'Attendance'}
              </h1>
              <p className="hidden sm:block text-sm text-gray-400 mt-0.5">Full check-in / check-out log history.</p>
            </div>
          </div>
          {!recLoading && selectedEmp && (
            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-500 overflow-x-auto whitespace-nowrap pb-1 sm:pb-0">
              <span className="bg-gray-100 border border-gray-200 rounded-lg px-2 py-1 font-bold text-gray-700 shrink-0">
                {filteredRecs.length} logs
              </span>
              <span className={`rounded-lg px-2 py-1 font-black border shrink-0 ${totalPoints >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                {totalPoints > 0 ? '+' : ''}{totalPoints} pts
              </span>
            </div>
          )}
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="flex flex-nowrap overflow-x-auto gap-2 items-center pb-2 sm:pb-0 hide-scrollbar">
            <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            {STATUS_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all whitespace-nowrap ${statusFilter === f.key
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                  }`}
              >
                {f.label}
              </button>
            ))}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-700 transition-colors font-bold whitespace-nowrap"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
          <div className="flex flex-row items-center gap-2">
            <DatePickerBtn value={dateFrom} onChange={setDateFrom} placeholder="From date" />
            <span className="text-gray-300 text-sm flex-shrink-0">→</span>
            <DatePickerBtn value={dateTo} onChange={setDateTo} placeholder="To date" min={dateFrom || undefined} />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {recLoading ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-medium">Loading records...</p>
            </div>
          ) : !selectedEmp ? (
            <div className="py-20 text-center opacity-40">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Select an employee to view attendance</p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full whitespace-nowrap text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                      <th className="px-6 py-3 text-left">Date</th>
                      <th className="px-6 py-3 text-left">Day</th>
                      <th className="px-6 py-3 text-left">Check In</th>
                      <th className="px-6 py-3 text-left">Check Out</th>
                      <th className="px-6 py-3 text-left">Duration</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paged.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-20 text-center">
                          <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                          <p className="text-sm text-gray-400 font-medium">No records match the selected filters.</p>
                          {hasFilters && (
                            <button onClick={clearFilters} className="mt-3 text-xs text-indigo-600 hover:text-indigo-700 font-semibold underline">
                              Clear filters
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : paged.map((record) => {
                      const pts = Number(record.pointsAwarded || 0);
                      const duration = calcDuration(record.checkInTime, record.checkOutTime);
                      const dateObj = record.date ? new Date(record.date + 'T00:00:00') : null;
                      const dayName = dateObj ? dateObj.toLocaleDateString('en-US', { weekday: 'short' }) : '—';
                      const isToday = record.date === new Date().toISOString().split('T')[0];
                      return (
                        <tr key={record._id} className="hover:bg-indigo-50/20 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {isToday && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />}
                              <span className="font-semibold text-gray-800">{formatDate(record.date)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-400 font-medium">{dayName}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-gray-700">
                              <LogIn className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                              <span className="font-medium">{formatTime(record.checkInTime)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <LogOut className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                              <span className={record.checkOutTime ? 'font-medium text-gray-700' : record.status === 'LATE_REJECTED' ? 'text-gray-300' : isToday ? 'text-amber-500 italic text-xs' : 'text-red-500 font-bold text-xs uppercase'}>
                                {record.checkOutTime 
                                  ? formatTime(record.checkOutTime) 
                                  : record.status === 'LATE_REJECTED' 
                                    ? '—' 
                                    : isToday 
                                      ? 'Still in' 
                                      : 'Missed'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <Clock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                              <span className="font-medium text-gray-600">{duration}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4"><StatusBadge status={record.status} /></td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {pts > 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                : pts < 0 ? <TrendingDown className="w-3.5 h-3.5 text-red-400" /> : null}
                              <span className={`font-extrabold tabular-nums text-sm ${pts > 0 ? 'text-emerald-600' : pts < 0 ? 'text-red-500' : 'text-gray-400'}`}>
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

              {/* Mobile card view */}
              <div className="md:hidden divide-y divide-gray-100">
                {paged.length === 0 ? (
                  <div className="px-6 py-20 text-center">
                    <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-400 font-medium">No records match the selected filters.</p>
                  </div>
                ) : paged.map((record) => {
                  const pts = Number(record.pointsAwarded || 0);
                  const duration = calcDuration(record.checkInTime, record.checkOutTime);
                  const isToday = record.date === new Date().toISOString().split('T')[0];
                  const dateObj = record.date ? new Date(record.date + 'T00:00:00') : null;
                  const dayName = dateObj ? dateObj.toLocaleDateString('en-US', { weekday: 'long' }) : '—';
                  return (
                    <div key={record._id} className="p-4 bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {isToday && <span className="w-2 h-2 rounded-full bg-indigo-400" />}
                          <span className="font-bold text-gray-800">{formatDate(record.date)}</span>
                          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">({dayName})</span>
                        </div>
                        <StatusBadge status={record.status} />
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="space-y-1">
                          <p className="text-[9px] uppercase font-bold text-gray-400 tracking-widest">Check In</p>
                          <div className="flex items-center gap-1.5">
                            <LogIn className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-sm font-bold text-gray-700">{formatTime(record.checkInTime)}</span>
                          </div>
                        </div>
                        <div className="space-y-1 border-l border-gray-200 pl-4">
                          <p className="text-[9px] uppercase font-bold text-gray-400 tracking-widest">Check Out</p>
                          <div className="flex items-center gap-1.5">
                            <LogOut className="w-3.5 h-3.5 text-gray-300" />
                            <span className={`text-sm font-bold ${record.checkOutTime ? 'text-gray-700' : record.status === 'LATE_REJECTED' ? 'text-gray-300' : isToday ? 'text-amber-500 italic text-xs' : 'text-red-600 uppercase text-xs'}`}>
                              {record.checkOutTime 
                                ? formatTime(record.checkOutTime) 
                                : record.status === 'LATE_REJECTED' 
                                  ? '—' 
                                  : isToday 
                                    ? 'Still in' 
                                    : 'Missed'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-300" />
                          <span className="text-xs font-semibold text-gray-500">Duration: <span className="text-gray-700">{duration}</span></span>
                        </div>
                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border ${pts >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                          {pts > 0 ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : pts < 0 ? <TrendingDown className="w-3 h-3 text-red-400" /> : null}
                          <span className={`text-xs font-black tabular-nums ${pts > 0 ? 'text-emerald-700' : pts < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {pts > 0 ? '+' : ''}{pts} {pts !== 0 && 'pts'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {(totalPages > 1 || filteredRecs.length > 0) && (
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs text-gray-400 font-medium">
                    Showing{' '}
                    <span className="font-bold text-gray-700">{Math.min((page - 1) * PAGE_SIZE + 1, filteredRecs.length)}</span>
                    {' '}–{' '}
                    <span className="font-bold text-gray-700">{Math.min(page * PAGE_SIZE, filteredRecs.length)}</span>
                    {' '}of{' '}
                    <span className="font-bold text-gray-700">{filteredRecs.length}</span> records
                    {hasFilters && <span className="text-indigo-500"> (filtered)</span>}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 border border-gray-200 rounded-lg bg-white text-gray-500 disabled:opacity-30 hover:bg-gray-50 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1">
                      {[...Array(totalPages)].map((_, i) => {
                        const pg = i + 1;
                        const show = pg === 1 || pg === totalPages || Math.abs(pg - page) <= 1;
                        const ellipsisBefore = pg === page - 2 && page - 2 > 1;
                        const ellipsisAfter = pg === page + 2 && page + 2 < totalPages;
                        if (!show && !ellipsisBefore && !ellipsisAfter) return null;
                        if (ellipsisBefore || ellipsisAfter) return <span key={`e-${i}`} className="text-gray-300 text-xs px-1">…</span>;
                        return (
                          <button
                            key={pg}
                            onClick={() => setPage(pg)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${page === pg
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
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
                      className="p-1.5 border border-gray-200 rounded-lg bg-white text-gray-500 disabled:opacity-30 hover:bg-gray-50 transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAttendance;
