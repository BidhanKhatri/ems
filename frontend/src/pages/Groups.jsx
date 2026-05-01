import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { toast } from 'sonner';
import {
  Users, Plus, Trash2, X, Search, UserPlus, UserMinus,
  Mail, Send, CheckSquare, Square, ChevronDown, ChevronUp, Layers
} from 'lucide-react';

/* ── Avatar ── */
const Avatar = ({ name }) => {
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 border border-primary/10">
      {initials}
    </div>
  );
};

/* ── Broadcast Email Modal ── */
const BroadcastModal = ({ group, onClose }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return toast.error('Subject and message are required');
    setSending(true);
    try {
      const { data } = await api.post(`/groups/${group._id}/broadcast`, { subject, message });
      toast.success(data.message);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-gray-200 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" /> Broadcast Email
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Sending to <span className="font-semibold text-gray-600">{group.employees.length}</span> member{group.employees.length !== 1 ? 's' : ''} in <span className="font-semibold text-gray-600">{group.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Recipients */}
        {group.employees.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-50 bg-gray-50/50">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">Recipients</p>
            <div className="flex flex-wrap gap-1.5">
              {group.employees.slice(0, 8).map(emp => (
                <span key={emp._id} className="text-[11px] bg-primary/5 border border-primary/15 text-primary rounded-md px-2 py-0.5 font-medium">{emp.email}</span>
              ))}
              {group.employees.length > 8 && (
                <span className="text-[11px] bg-gray-100 border border-gray-200 text-gray-500 rounded-md px-2 py-0.5 font-medium">+{group.employees.length - 8} more</span>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSend} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Subject</label>
            <input
              required
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Team Announcement"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Message</label>
            <textarea
              required
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              placeholder="Type your message here..."
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm resize-none transition-all"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={sending} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-primary/20">
              <Send className="w-3.5 h-3.5" /> {sending ? 'Sending...' : 'Send Broadcast'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ── Add Members Modal ── */
const AddMembersModal = ({ group, onClose, onUpdated }) => {
  const [allUsers, setAllUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.get('/admin/users', { params: { limit: 200 } })
      .then(({ data }) => {
        const memberIds = group.employees.map(e => e._id);
        setAllUsers(data.users.filter(u => u.role === 'EMPLOYEE' && !memberIds.includes(u._id)));
      })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, [group]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allUsers.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [allUsers, search]);

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map(u => u._id));

  const handleAdd = async () => {
    if (!selected.length) return toast.error('Select at least one employee');
    setAdding(true);
    try {
      const { data } = await api.post(`/groups/${group._id}/members`, { userIds: selected });
      toast.success(`${selected.length} member${selected.length > 1 ? 's' : ''} added`);
      onUpdated(data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add members');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-200 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">Add Members</h2>
              <p className="text-xs text-gray-400 mt-0.5">Group: <span className="font-semibold text-gray-600">{group.name}</span></p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          {filtered.length > 0 && (
            <button onClick={toggleAll} className="mt-2 text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium">
              {selected.length === filtered.length ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              {selected.length === filtered.length ? 'Deselect all' : `Select all (${filtered.length})`}
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-10">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10 italic">No available employees</p>
          ) : filtered.map(u => (
            <div
              key={u._id}
              onClick={() => toggle(u._id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                selected.includes(u._id)
                  ? 'bg-primary/5 border-primary/30'
                  : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              {/* Checkbox */}
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                selected.includes(u._id) ? 'bg-primary border-primary' : 'border-gray-300'
              }`}>
                {selected.includes(u._id) && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <Avatar name={u.name} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-800 truncate">{u.name}</p>
                <p className="text-xs text-gray-400 truncate">{u.email}</p>
              </div>
              <span className="text-xs font-bold text-primary flex-shrink-0">{u.performanceScore ?? 0} pts</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleAdd} disabled={adding || !selected.length} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-primary/20">
            <UserPlus className="w-3.5 h-3.5" /> {adding ? 'Adding...' : `Add ${selected.length > 0 ? `(${selected.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Group Card ── */
const GroupCard = ({ group, onDeleted, onUpdated }) => {
  const [expanded, setExpanded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [removing, setRemoving] = useState(null);

  const handleRemove = async (userId) => {
    setRemoving(userId);
    try {
      const { data } = await api.delete(`/groups/${group._id}/members/${userId}`);
      toast.success('Member removed');
      onUpdated(data);
    } catch {
      toast.error('Failed to remove member');
    } finally {
      setRemoving(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${group.name}"? All members will be unassigned.`)) return;
    try {
      await api.delete(`/groups/${group._id}`);
      toast.success('Group deleted');
      onDeleted(group._id);
    } catch {
      toast.error('Failed to delete group');
    }
  };

  const totalPts = group.employees.reduce((s, e) => s + (e.performanceScore ?? 0), 0);
  const avgPts = group.employees.length ? Math.round(totalPts / group.employees.length) : 0;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-200">
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              {/* Icon with a touch of primary */}
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/10 flex items-center justify-center flex-shrink-0">
                <Layers className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 text-sm truncate">{group.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{group.employees.length} member{group.employees.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button onClick={handleDelete} className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg transition-colors flex-shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-center">
              <p className="text-base font-extrabold text-gray-800 tabular-nums">{group.employees.length}</p>
              <p className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold mt-0.5">Members</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-center">
              <p className="text-base font-extrabold text-primary tabular-nums">{avgPts}</p>
              <p className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold mt-0.5">Avg Score</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-center">
              <p className="text-base font-extrabold text-primary tabular-nums">{totalPts}</p>
              <p className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold mt-0.5">Total Pts</p>
            </div>
          </div>
        </div>

        {/* Collapsible member list */}
        <div className="border-t border-gray-50">
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-50/60 transition-colors"
          >
            <span className="uppercase tracking-wider">Members</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {expanded && (
            <div className="px-4 pb-3 space-y-1.5 max-h-56 overflow-y-auto">
              {group.employees.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-3">No members yet</p>
              ) : group.employees.map(emp => (
                <div key={emp._id} className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
                  <Avatar name={emp.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{emp.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{emp.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Points with primary accent */}
                    <span className="text-xs font-bold text-primary tabular-nums">{emp.performanceScore ?? 0} <span className="font-normal text-gray-400">pts</span></span>
                    <button
                      onClick={() => handleRemove(emp._id)}
                      disabled={removing === emp._id}
                      className="p-1 text-gray-300 hover:text-red-400 rounded-md transition-colors disabled:opacity-40"
                    >
                      <UserMinus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-auto px-4 py-3 border-t border-gray-50 flex gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add Members
          </button>
          <button
            onClick={() => setShowBroadcast(true)}
            disabled={!group.employees.length}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 text-xs font-semibold hover:bg-gray-50 hover:border-primary/30 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Mail className="w-3.5 h-3.5" /> Send Email
          </button>
        </div>
      </div>

      {showAdd && <AddMembersModal group={group} onClose={() => setShowAdd(false)} onUpdated={onUpdated} />}
      {showBroadcast && <BroadcastModal group={group} onClose={() => setShowBroadcast(false)} />}
    </>
  );
};

/* ── Main Page ── */
const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    try {
      const { data } = await api.get('/groups');
      setGroups(data);
    } catch {
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/groups', { name: newGroupName.trim() });
      setGroups(g => [...g, { ...data, employees: [] }]);
      setNewGroupName('');
      toast.success('Group created');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? groups.filter(g => g.name.toLowerCase().includes(q)) : groups;
  }, [groups, search]);

  return (
    <div className="space-y-6 pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Group Management</h1>
          <p className="text-sm text-gray-400 mt-0.5">Organise staff into groups, manage members, and send broadcast emails.</p>
        </div>
        {!loading && (
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span><span className="font-semibold text-gray-700">{groups.length}</span> groups</span>
            <span className="w-px h-3 bg-gray-200" />
            <span><span className="font-semibold text-gray-700">{groups.reduce((s, g) => s + g.employees.length, 0)}</span> assigned</span>
            <span className="w-px h-3 bg-gray-200" />
            {/* Total points with primary color */}
            <span><span className="font-semibold text-primary">{groups.reduce((s, g) => s + g.employees.reduce((es, e) => es + (e.performanceScore ?? 0), 0), 0)}</span> pts total</span>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search groups..."
            className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <form onSubmit={handleCreateGroup} className="flex w-full sm:w-auto">
          <input
            required
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            placeholder="New group name..."
            className="flex-1 sm:w-48 px-4 py-2 bg-gray-50 border border-gray-200 border-r-0 rounded-l-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 bg-primary text-white font-semibold text-sm rounded-r-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap shadow-sm shadow-primary/20"
          >
            <Plus className="w-3.5 h-3.5" /> {creating ? 'Creating...' : 'Create'}
          </button>
        </form>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-100 rounded-xl" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 bg-gray-100 rounded w-1/2" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(j => <div key={j} className="h-12 bg-gray-50 rounded-xl border border-gray-100" />)}
              </div>
              <div className="h-8 bg-gray-50 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(group => (
            <GroupCard
              key={group._id}
              group={group}
              onDeleted={(id) => setGroups(g => g.filter(gr => gr._id !== id))}
              onUpdated={(updated) => setGroups(g => g.map(gr => gr._id === updated._id ? updated : gr))}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-400">
                {search ? 'No groups match your search' : 'No groups yet — create your first one above'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Groups;
