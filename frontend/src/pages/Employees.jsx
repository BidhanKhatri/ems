import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { toast } from 'sonner';
import {
  Users, Search, ShieldAlert, ShieldCheck,
  ChevronLeft, ChevronRight, Trash2,
  UserX, UserCheck, Filter as FilterIcon, MessageSquarePlus, Image as ImageIcon, X
} from 'lucide-react';
import { format } from 'date-fns';

const Employees = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [limit] = useState(10);

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [statusConfirm, setStatusConfirm] = useState(null);

  // Feedback state
  const [feedbackModalFor, setFeedbackModalFor] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackPoints, setFeedbackPoints] = useState('');
  const [feedbackImage, setFeedbackImage] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users', {
        params: { page, limit, search }
      });
      setUsers(data.users);
      setTotalPages(data.totalPages);
      setTotalUsers(data.totalUsers);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load employee directory');
    } finally {
      setLoading(false);
    }
  };



  const handleToggleStatus = async (userId, bypass = false) => {
    const userToToggle = users.find(u => u._id === userId);

    // Only show confirmation when BLOCKING (deactivating)
    if (userToToggle?.isActive && !bypass) {
      setStatusConfirm(userId);
      return;
    }

    try {
      const { data } = await api.patch(`/admin/users/${userId}/status`);
      toast.success(data.message);
      setUsers(users.map(u => u._id === userId ? { ...u, isActive: data.user.isActive } : u));
      setStatusConfirm(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update account status');
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) return toast.error('Feedback text is required');

    setFeedbackLoading(true);
    try {
      const formData = new FormData();
      formData.append('text', feedbackText);
      formData.append('points', feedbackPoints || 0);
      if (feedbackImage) {
        formData.append('image', feedbackImage);
      }

      await api.post(`/admin/users/${feedbackModalFor}/feedback`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Feedback submitted and employee notified');
      setFeedbackModalFor(null);
      setFeedbackText('');
      setFeedbackPoints('');
      setFeedbackImage(null);
      fetchUsers(); // Refresh to show new points
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit feedback');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/admin/users/${deleteConfirm}`);
      toast.success('Employee record removed');
      setDeleteConfirm(null);
      fetchUsers();
    } catch (error) {
      console.error(error);
      toast.error('Failed to remove employee');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Employee Management</h1>
          <p className="text-sm text-gray-500 mt-1">Directory of {totalUsers} registered staff members</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm outline-none"
            />
          </div>
          <button className="p-2 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 text-gray-600 transition-colors">
            <FilterIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Employee</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Role & Group</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Score / Points</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array(5).fill(0).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan="5" className="px-6 py-8"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center opacity-40">
                      <Users className="w-12 h-12 mb-2" />
                      <p className="font-medium text-gray-600">No employees found matching your criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((row) => (
                  <tr key={row._id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100 flex-shrink-0 overflow-hidden">
                          {row.profilePicture ? (
                            <img src={row.profilePicture} alt={row.name} className="w-full h-full object-cover" />
                          ) : (
                            row.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">{row.name}</p>
                          <p className="text-[11px] text-gray-500 font-medium truncate mt-0.5">{row.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold w-fit ${row.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                          {row.role}
                        </span>
                        <span className="text-[11px] text-gray-400 font-medium">
                          {row.groupId?.name || 'Unassigned'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">{row.performanceScore} pts</span>
                        <span className="text-[11px] text-gray-400">Total: {row.totalPoints}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {row.isActive ? (
                        <span className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-bold border border-emerald-100">
                          <ShieldCheck className="w-3 h-3 mr-1" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 bg-red-50 text-red-600 rounded-full text-[11px] font-bold border border-red-100">
                          <ShieldAlert className="w-3 h-3 mr-1" /> Restricted
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setFeedbackModalFor(row._id)}
                          className="p-2 border border-blue-200 rounded-xl bg-blue-50 text-blue-500 hover:text-blue-600 hover:bg-blue-100 transition-all"
                          title="Give Feedback"
                        >
                          <MessageSquarePlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(row._id)}
                          className={`p-2 rounded-xl border transition-all ${row.isActive
                            ? 'bg-amber-50 border-amber-100 text-amber-600 hover:bg-amber-100'
                            : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'
                            }`}
                          title={row.isActive ? 'Block Account' : 'Unblock Account'}
                        >
                          {row.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(row._id)}
                          className="p-2 border border-gray-200 rounded-xl bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all"
                          title="Delete Employee"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-100">
          {loading ? (
             <div className="p-8 text-center animate-pulse text-gray-400 font-bold uppercase tracking-widest">Loading Directory...</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center opacity-40 italic">No employees found.</div>
          ) : (
            users.map((row) => (
              <div key={row._id} className="p-5 flex flex-col gap-5 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold overflow-hidden shadow-sm">
                      {row.profilePicture ? <img src={row.profilePicture} className="w-full h-full object-cover" /> : row.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 leading-tight">{row.name}</p>
                      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{row.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-900 tabular-nums">{row.performanceScore} pts</p>
                    <p className="text-[10px] text-gray-400 font-medium">{row.groupId?.name || 'Unassigned'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                   <button onClick={() => setFeedbackFor(row._id)} className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 flex items-center justify-center gap-2">
                     <MessageSquarePlus className="w-4 h-4" />
                     <span className="text-[11px] font-bold uppercase tracking-wider">Feedback</span>
                   </button>
                   <button 
                     onClick={() => handleToggleStatus(row._id)}
                     className={`flex-1 py-3 rounded-2xl border flex items-center justify-center gap-2 transition-all ${
                       row.isActive ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                     }`}
                   >
                     {row.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                     <span className="text-[11px] font-bold uppercase tracking-wider">{row.isActive ? 'Block' : 'Unblock'}</span>
                   </button>
                   <button onClick={() => setDeleteConfirm(row._id)} className="p-3 bg-red-50 text-red-500 border border-red-100 rounded-2xl">
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Bar */}
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500 font-medium tracking-tight">
            Showing <span className="text-gray-900">{users.length}</span> of <span className="text-gray-900">{totalUsers}</span> accounts
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="p-2 border border-gray-200 rounded-xl bg-white text-gray-600 disabled:opacity-30 transition-all hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1 px-2">
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
              disabled={page === totalPages || loading}
              className="p-2 border border-gray-200 rounded-xl bg-white text-gray-600 disabled:opacity-30 transition-all hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-gray-900/10">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-6 mx-auto">
              <Trash2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 text-center">Permanently Delete?</h2>
            <p className="text-gray-500 text-sm text-center mt-3 leading-relaxed">
              This action will remove all history and data associated with this employee. This cannot be undone.
            </p>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="flex-1 px-4 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 shadow-lg shadow-red-200 transition-colors"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {statusConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-gray-900/10">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-6 mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 text-center">Restrict Account?</h2>
            <p className="text-gray-500 text-sm text-center mt-3 leading-relaxed">
              This employee will no longer be able to log in to their dashboard. All their data will be preserved.
            </p>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStatusConfirm(null)}
                className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleToggleStatus(statusConfirm, true)}
                className="flex-1 px-4 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 shadow-lg shadow-red-200 transition-colors"
              >
                Restrict Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackModalFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-gray-900/10">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Provide Feedback</h2>
              <button onClick={() => setFeedbackModalFor(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleFeedbackSubmit} className="space-y-4 text-left">
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
                    <label className={`flex-1 px-4 py-3 bg-gray-50 border border-gray-200 border-dashed rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors overflow-hidden ${feedbackImage ? 'ring-2 ring-indigo-500/20 border-indigo-500' : ''}`}>
                      <ImageIcon className={`w-4 h-4 mr-2 ${feedbackImage ? 'text-indigo-500' : 'text-gray-400'} flex-shrink-0`} />
                      <span className={`text-xs font-medium truncate ${feedbackImage ? 'text-indigo-700' : 'text-gray-500'}`}>
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
                        title="Remove image"
                      >
                        <Trash2 className="w-4 h-4" />
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
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackModalFor(null);
                    setFeedbackImage(null);
                    setFeedbackText('');
                    setFeedbackPoints('');
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={feedbackLoading}
                  className="flex-1 px-4 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors disabled:opacity-50"
                >
                  {feedbackLoading ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Employees;
