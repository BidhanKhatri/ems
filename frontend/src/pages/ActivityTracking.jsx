import { useEffect, useState } from 'react';
import { Radar, ShieldAlert, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';

const ActivityTracking = () => {
  const [feed, setFeed] = useState({
    rows: [],
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    summary: { trackingEnabled: false, sessionMinutes: 0, activeTrackingNow: 0, missedToday: 0 },
    recentNotifications: [],
  });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchFeed = async ({
    pageArg = 1,
    searchArg = search,
    eventArg = eventFilter,
  } = {}) => {
    setLoading(true);
    try {
      const { data } = await api.get('/activity/admin/feed', {
        params: {
          page: pageArg,
          limit: feed.limit,
          search: searchArg || undefined,
          event: eventArg || 'ALL',
        },
      });
      setFeed(data);
    } catch (error) {
      console.error('Failed to fetch activity tracking feed', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed({ pageArg: 1, searchArg: '' });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      fetchFeed({ pageArg: 1, searchArg: searchInput.trim(), eventArg: eventFilter });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, eventFilter]);

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > feed.totalPages) return;
    fetchFeed({ pageArg: nextPage, searchArg: search, eventArg: eventFilter });
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <Radar className="w-6 h-6 text-indigo-600" />
              Activity Tracking
            </h1>
            <p className="text-sm text-gray-500 mt-1">Real-time activity confirmation logs, alerts, and compliance history.</p>
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search employee by name or email"
              className="w-full h-10 pl-10 pr-3 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-gray-900">Monitoring Summary</h2>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${feed.summary.trackingEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
              {feed.summary.trackingEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
              <p className="text-[11px] uppercase font-semibold tracking-wider text-indigo-500">Session</p>
              <p className="text-xl font-extrabold text-indigo-700 mt-1">{feed.summary.sessionMinutes || 0}m</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-[11px] uppercase font-semibold tracking-wider text-blue-500">Active Now</p>
              <p className="text-xl font-extrabold text-blue-700 mt-1">{feed.summary.activeTrackingNow || 0}</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
              <p className="text-[11px] uppercase font-semibold tracking-wider text-red-500">Missed Today</p>
              <p className="text-xl font-extrabold text-red-600 mt-1">{feed.summary.missedToday || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-orange-500" />
            Recent Admin Alerts
          </h2>
          <div className="mt-4 space-y-3 max-h-18 overflow-y-auto pr-1">
            {feed.recentNotifications?.length ? feed.recentNotifications.slice(0, 6).map((note) => (
              <div key={note._id} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                <p className="text-sm font-semibold text-gray-800">{note.title}</p>
                <p className="text-xs text-gray-600 mt-1">{note.message}</p>
              </div>
            )) : (
              <p className="text-sm text-gray-400 italic">No activity alerts yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <h2 className="text-lg font-extrabold text-gray-900">Employee Activity Timeline</h2>
            <div className="inline-flex p-1 rounded-xl border border-gray-200 bg-gray-50">
              <button
                onClick={() => setEventFilter('ALL')}
                className={`px-3 h-8 rounded-lg text-xs font-semibold transition-colors ${eventFilter === 'ALL' ? 'bg-white text-indigo-700 shadow border border-indigo-100' : 'text-gray-600 hover:text-gray-800'}`}
              >
                All
              </button>
              <button
                onClick={() => setEventFilter('MISSED')}
                className={`px-3 h-8 rounded-lg text-xs font-semibold transition-colors ${eventFilter === 'MISSED' ? 'bg-white text-red-600 shadow border border-red-100' : 'text-gray-600 hover:text-gray-800'}`}
              >
                Missed Check
              </button>
              <button
                onClick={() => setEventFilter('MARKED_ACTIVE')}
                className={`px-3 h-8 rounded-lg text-xs font-semibold transition-colors ${eventFilter === 'MARKED_ACTIVE' ? 'bg-white text-emerald-700 shadow border border-emerald-100' : 'text-gray-600 hover:text-gray-800'}`}
              >
                Marked Active
              </button>
            </div>
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full font-medium">{feed.total} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 text-left font-semibold">Employee</th>
                <th className="px-6 py-3 text-left font-semibold">Event</th>
                <th className="px-6 py-3 text-left font-semibold">IP</th>
                <th className="px-6 py-3 text-left font-semibold">Location</th>
                <th className="px-6 py-3 text-left font-semibold">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td className="px-6 py-6 text-sm text-gray-400" colSpan={5}>Loading activity records...</td></tr>
              ) : feed.rows.length ? feed.rows.map((log) => (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-6 py-3.5">
                    <p className="font-semibold text-gray-800">{log.userId?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-400">{log.userId?.email || '-'}</p>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${log.type === 'MISSED' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                      {log.type === 'MISSED' ? 'Missed Check' : 'Marked Active'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-gray-700">{log.ipAddress || '-'}</td>
                  <td className="px-6 py-3.5 text-gray-700">{log.locationLabel || '-'}</td>
                  <td className="px-6 py-3.5 text-gray-700">{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              )) : (
                <tr><td className="px-6 py-6 text-sm text-gray-400 italic" colSpan={5}>No matching activity records.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Page {feed.page} of {feed.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(feed.page - 1)}
              disabled={feed.page <= 1}
              className="h-8 px-3 rounded-lg border border-gray-300 text-xs font-semibold text-gray-600 disabled:opacity-40 flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              onClick={() => goToPage(feed.page + 1)}
              disabled={feed.page >= feed.totalPages}
              className="h-8 px-3 rounded-lg border border-gray-300 text-xs font-semibold text-gray-600 disabled:opacity-40 flex items-center gap-1"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityTracking;
