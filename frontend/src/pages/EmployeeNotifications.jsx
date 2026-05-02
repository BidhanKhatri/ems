import { useEffect, useState } from 'react';
import { BellRing, ImageIcon, X, ExternalLink } from 'lucide-react';
import api from '../services/api';

const EmployeeNotifications = () => {
  const [sortMode, setSortMode] = useState('latest');
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [viewingImage, setViewingImage] = useState(null);

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
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center border border-indigo-200">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-800 tracking-tight">Notifications</h1>
              <p className="text-sm text-gray-500 mt-0.5">Track activity prompts, missed sessions, and system updates.</p>
            </div>
          </div>

          <div className="inline-flex p-1 rounded-xl border border-gray-200 bg-gray-100">
            <button
              onClick={() => setSortMode('latest')}
              className={`px-3 h-8 rounded-lg text-xs font-semibold transition-colors ${sortMode === 'latest' ? 'bg-white text-indigo-800 shadow border border-indigo-100' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Latest
            </button>
            <button
              onClick={() => setSortMode('oldest')}
              className={`px-3 h-8 rounded-lg text-xs font-semibold transition-colors ${sortMode === 'oldest' ? 'bg-white text-indigo-800 shadow border border-indigo-100' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Oldest
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        {loading ? (
          <p className="text-sm text-gray-500">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No notifications available right now.</p>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n._id}
                className={`rounded-xl border p-4 ${n.isRead ? 'bg-white border-gray-200' : 'bg-indigo-50/60 border-indigo-200'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{n.message}</p>
                    <p className="text-[11px] text-gray-400 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {!n.isRead && (
                      <button
                        onClick={() => markNotificationAsRead(n._id)}
                        className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900"
                      >
                        Mark read
                      </button>
                    )}
                    {n.metadata?.imageUrl && (
                      <button
                        onClick={() => setViewingImage(n.metadata.imageUrl)}
                        className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-600 hover:bg-gray-50 hover:text-indigo-800 transition-all shadow-sm"
                        title="View attached image"
                      >
                        <ImageIcon className="w-3 h-3" />
                        Preview
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {viewingImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-10 backdrop-blur-md bg-gray-900/40 animate-in fade-in duration-200">
          <div className="relative max-w-4xl w-full bg-white rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <a
                href={viewingImage}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/80 backdrop-blur-md text-gray-700 rounded-xl hover:bg-white transition-colors shadow-sm"
                title="Open in new tab"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
              <button
                onClick={() => setViewingImage(null)}
                className="p-2 bg-white/80 backdrop-blur-md text-gray-700 rounded-xl hover:bg-white transition-colors shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 sm:p-4 bg-gray-50">
              <img
                src={viewingImage}
                alt="Feedback Attachment"
                className="w-full h-auto max-h-[80vh] object-contain rounded-xl shadow-inner"
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Feedback Attachment</p>
              <button
                onClick={() => setViewingImage(null)}
                className="text-sm font-bold text-indigo-800 hover:underline"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default EmployeeNotifications;

