import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import api from '../services/api';

const EmployeeNotifications = () => {
  const [sortMode, setSortMode] = useState('latest');
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async (mode = sortMode) => {
    setLoading(true);
    try {
      const { data } = await api.get('/activity/notifications', {
        params: { sort: mode },
      });
      setNotifications(data || []);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(sortMode);
  }, [sortMode]);

  const markNotificationAsRead = async (id) => {
    try {
      await api.patch(`/activity/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      window.dispatchEvent(new CustomEvent('notificationUpdate'));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-[#FAF8F5] border border-stone-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-200">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-stone-800 tracking-tight">Notifications</h1>
              <p className="text-sm text-stone-500 mt-0.5">Track activity prompts, missed sessions, and system updates.</p>
            </div>
          </div>

          <div className="inline-flex p-1 rounded-xl border border-stone-200 bg-stone-100">
            <button
              onClick={() => setSortMode('latest')}
              className={`px-3 h-8 rounded-lg text-xs font-semibold transition-colors ${sortMode === 'latest' ? 'bg-white text-amber-800 shadow border border-amber-100' : 'text-stone-600 hover:text-stone-800'}`}
            >
              Latest
            </button>
            <button
              onClick={() => setSortMode('oldest')}
              className={`px-3 h-8 rounded-lg text-xs font-semibold transition-colors ${sortMode === 'oldest' ? 'bg-white text-amber-800 shadow border border-amber-100' : 'text-stone-600 hover:text-stone-800'}`}
            >
              Oldest
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#FAF8F5] border border-stone-200 rounded-2xl p-5 shadow-sm">
        {loading ? (
          <p className="text-sm text-stone-500">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-stone-500 italic">No notifications available right now.</p>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n._id}
                className={`rounded-xl border p-4 ${n.isRead ? 'bg-[#FCFBF8] border-stone-200' : 'bg-amber-50/60 border-amber-200'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{n.title}</p>
                    <p className="text-xs text-stone-600 mt-1">{n.message}</p>
                    <p className="text-[11px] text-stone-400 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={() => markNotificationAsRead(n._id)}
                      className="text-[11px] font-semibold text-amber-700 hover:text-amber-900"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default EmployeeNotifications;

