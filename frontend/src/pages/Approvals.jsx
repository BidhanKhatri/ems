import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'sonner';
import { RotateCw, UserCheck, Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Filter, AlertCircle, Mail } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

const Approvals = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'accounts' ? 'accounts' : 'checkins'); // 'checkins' or 'accounts'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Check-in state
  const [checkinApprovals, setCheckinApprovals] = useState([]);
  
  // Account state
  const [accountApprovals, setAccountApprovals] = useState([]);
  const [accountPage, setAccountPage] = useState(1);
  const [accountTotalPages, setAccountTotalPages] = useState(1);
  const [accountStatusFilter, setAccountStatusFilter] = useState('PENDING'); // ALL, PENDING, APPROVED, REJECTED
  const [accountSearch, setAccountSearch] = useState('');
  
  const [confirmingAction, setConfirmingAction] = useState(null); // { userId, name, status }

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'accounts') setActiveTab('accounts');
    else setActiveTab('checkins');
  }, [searchParams]);

  const { socket } = useSocket();

  useEffect(() => {
    fetchData();
  }, [activeTab, accountPage, accountStatusFilter, accountSearch]);

  // Real-time socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleDashboardUpdate = () => {
      console.log('Real-time dashboard update received');
      fetchData();
    };

    const handleNewNotification = (data) => {
       // Only show toast if it's an approval request
       if (data.metadata?.type === 'APPROVAL_REQUEST') {
         toast.info(data.message || 'New account approval request received');
         fetchData();
       }
    };

    socket.on('admin:dashboard-update', handleDashboardUpdate);
    socket.on('notification:received', handleNewNotification);

    return () => {
      socket.off('admin:dashboard-update', handleDashboardUpdate);
      socket.off('notification:received', handleNewNotification);
    };
  }, [socket, activeTab]); // Re-bind if tab changes to ensure fresh fetchData context

  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      if (activeTab === 'checkins') {
        const { data } = await api.get('/admin/approvals');
        setCheckinApprovals(data);
      } else {
        const { data } = await api.get('/admin/account-approvals', {
          params: { 
            page: accountPage, 
            limit: 5,
            status: accountStatusFilter === 'ALL' ? '' : accountStatusFilter,
            search: accountSearch
          }
        });
        setAccountApprovals(data.users);
        setAccountTotalPages(data.totalPages);
      }
      if (isManual) toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to fetch approvals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCheckinAction = async (id, isApproved) => {
    try {
      await api.post(`/admin/approve/${id}`, { isApproved });
      toast.success(`Check-in ${isApproved ? 'approved' : 'rejected'}`);
      fetchData();
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const handleAccountAction = async (userId, status) => {
    try {
      await api.patch(`/admin/account-approvals/${userId}`, { status });
      toast.success(`Account ${status.toLowerCase()} successfully`);
      setConfirmingAction(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to update account status');
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Sidebar Navigation removed as it is now in main sidebar */}

      {/* Main Content Area */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[500px]">
        {/* Header */}
        <div className="p-4 sm:p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-white to-gray-50/30">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight truncate">
              {activeTab === 'checkins' ? 'Check-ins' : 'Accounts'}
            </h2>
            <p className="hidden sm:block text-xs text-gray-500 mt-1 font-medium tracking-tight">
              {activeTab === 'checkins' 
                ? 'Review late check-in requests' 
                : 'Manage employee portal access'
              }
            </p>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={loading || refreshing}
            className="p-2.5 sm:p-3 bg-white text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-100 hover:border-indigo-100 rounded-xl sm:rounded-2xl transition-all shadow-sm group shrink-0"
          >
            <RotateCw className={`w-4 h-4 sm:w-5 sm:h-5 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          </button>
        </div>

        {/* Tab-specific Filters for Accounts */}
        {activeTab === 'accounts' && (
          <div className="px-4 sm:px-8 py-4 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-nowrap overflow-x-auto gap-2 items-center hide-scrollbar">
              <div className="p-1.5 bg-white rounded-lg border border-gray-100 shadow-sm shrink-0">
                <Filter className="w-3 h-3 text-gray-400" />
              </div>
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setAccountStatusFilter(s);
                    setAccountPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${
                    accountStatusFilter === s 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                    : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Email Search Bar */}
            <div className="relative w-full sm:w-64">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Mail className="w-3 h-3 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search email..."
                value={accountSearch}
                onChange={(e) => {
                  setAccountSearch(e.target.value);
                  setAccountPage(1);
                }}
                className="w-full pl-8 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm placeholder:text-gray-400"
              />
            </div>
          </div>
        )}

        {/* List Content */}
        <div className="flex-1">
          {loading && !refreshing ? (
            <div className="py-32 text-center flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-indigo-50 border-t-indigo-600 rounded-full animate-spin shadow-inner" />
              <p className="text-sm font-bold text-gray-400 tracking-tight">Synchronizing Database...</p>
            </div>
          ) : activeTab === 'checkins' ? (
            <>
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full whitespace-nowrap">
                  <thead className="bg-gray-50/50 border-b border-gray-100">
                    <tr className="text-left text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                      <th className="px-8 py-5">Employee</th>
                      <th className="px-8 py-5">Reason / Message</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {checkinApprovals.length === 0 ? (
                      <tr><td colSpan="4" className="py-32 text-center text-gray-400 text-sm font-medium italic">No pending check-in requests.</td></tr>
                    ) : checkinApprovals.map((req) => (
                      <tr key={req._id} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-4">
                             <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 overflow-hidden shrink-0 shadow-sm">
                               {req.userId?.profilePicture ? <img src={req.userId.profilePicture} className="w-full h-full object-cover" /> : req.userId?.name?.[0]}
                             </div>
                             <div>
                               <p className="text-sm font-bold text-gray-900 leading-none mb-1.5">{req.userId?.name || 'Unknown'}</p>
                               <p className="text-[11px] text-gray-500 font-medium tracking-tight">{req.userId?.email}</p>
                             </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-sm text-gray-600 font-medium max-w-sm truncate bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">{req.reason}</p>
                        </td>
                        <td className="px-8 py-6 text-right space-x-2">
                           <button onClick={() => handleCheckinAction(req._id, true)} className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border border-emerald-100 shadow-sm">Approve</button>
                           <button onClick={() => handleCheckinAction(req._id, false)} className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border border-red-100 shadow-sm">Reject</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden divide-y divide-gray-50">
                {checkinApprovals.length === 0 ? (
                  <div className="py-20 text-center text-gray-400 text-sm font-medium italic">No pending requests.</div>
                ) : checkinApprovals.map((req) => (
                  <div key={req._id} className="p-5 flex flex-col gap-4 bg-white">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 overflow-hidden shrink-0">
                         {req.userId?.profilePicture ? <img src={req.userId.profilePicture} className="w-full h-full object-cover" /> : req.userId?.name?.[0]}
                       </div>
                       <div>
                         <p className="text-sm font-bold text-gray-900 leading-tight">{req.userId?.name || 'Unknown'}</p>
                         <p className="text-[10px] text-gray-500 font-medium">{req.userId?.email}</p>
                       </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Reason</p>
                       <p className="text-xs text-gray-600 font-medium leading-relaxed">{req.reason}</p>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => handleCheckinAction(req._id, true)} className="flex-1 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-emerald-100">Approve</button>
                       <button onClick={() => handleCheckinAction(req._id, false)} className="flex-1 py-2.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-red-100">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full whitespace-nowrap">
                  <thead className="bg-gray-50/50 border-b border-gray-100">
                    <tr className="text-left text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                      <th className="px-8 py-5">Employee Details</th>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {accountApprovals.length === 0 ? (
                      <tr><td colSpan="4" className="py-32 text-center text-gray-400 text-sm font-medium italic">No account records found.</td></tr>
                    ) : accountApprovals.map((emp) => (
                      <tr key={emp._id} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-4">
                             <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 overflow-hidden shrink-0 shadow-sm">
                               {emp.profilePicture ? <img src={emp.profilePicture} className="w-full h-full object-cover" /> : emp.name[0]}
                             </div>
                             <div>
                               <p className="text-sm font-bold text-gray-900 leading-none mb-1.5">{emp.name}</p>
                               <p className="text-[11px] text-gray-500 font-medium tracking-tight">{emp.email.toLowerCase()}</p>
                             </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border shadow-sm ${
                             emp.approvalStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                             emp.approvalStatus === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' :
                             'bg-amber-50 text-amber-600 border-amber-100'
                           }`}>
                             {emp.approvalStatus === 'APPROVED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                             {emp.approvalStatus === 'REJECTED' && <XCircle className="w-3.5 h-3.5" />}
                             {emp.approvalStatus === 'PENDING' && <Clock className="w-3.5 h-3.5 animate-pulse" />}
                             {emp.approvalStatus || 'PENDING'}
                           </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                           {emp.approvalStatus === 'PENDING' ? (
                             <div className="space-x-2">
                               <button onClick={() => setConfirmingAction({ userId: emp._id, name: emp.name, status: 'APPROVED' })} className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-md shadow-indigo-100 border border-indigo-600">Approve</button>
                               <button onClick={() => setConfirmingAction({ userId: emp._id, name: emp.name, status: 'REJECTED' })} className="px-4 py-2 bg-white text-red-600 border border-red-100 hover:bg-red-50 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all">Reject</button>
                             </div>
                           ) : (
                             <button 
                               onClick={() => setConfirmingAction({ userId: emp._id, name: emp.name, status: emp.approvalStatus === 'APPROVED' ? 'REJECTED' : 'APPROVED' })}
                               className="px-4 py-2 bg-white border border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 rounded-xl transition-all shadow-sm"
                             >
                               {emp.approvalStatus === 'APPROVED' ? 'Revoke Access' : 'Re-Approve'}
                             </button>
                           )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden divide-y divide-gray-50">
                {accountApprovals.length === 0 ? (
                  <div className="py-20 text-center text-gray-400 text-sm font-medium italic">No account records.</div>
                ) : accountApprovals.map((emp) => (
                  <div key={emp._id} className="p-5 bg-white flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 overflow-hidden shrink-0">
                           {emp.profilePicture ? <img src={emp.profilePicture} className="w-full h-full object-cover" /> : emp.name[0]}
                         </div>
                         <div>
                           <p className="text-sm font-bold text-gray-900 leading-tight">{emp.name}</p>
                           <p className="text-[10px] text-gray-500 font-medium">{emp.email.toLowerCase()}</p>
                         </div>
                       </div>
                       <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase border ${
                         emp.approvalStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                         emp.approvalStatus === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' :
                         'bg-amber-50 text-amber-600 border-amber-100'
                       }`}>
                         {emp.approvalStatus || 'PENDING'}
                       </span>
                    </div>
                    <div className="flex gap-2">
                       {emp.approvalStatus === 'PENDING' ? (
                         <>
                           <button onClick={() => setConfirmingAction({ userId: emp._id, name: emp.name, status: 'APPROVED' })} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider">Approve</button>
                           <button onClick={() => setConfirmingAction({ userId: emp._id, name: emp.name, status: 'REJECTED' })} className="flex-1 py-2.5 bg-white text-red-600 border border-red-100 rounded-xl text-[10px] font-bold uppercase tracking-wider">Reject</button>
                         </>
                       ) : (
                         <button 
                           onClick={() => setConfirmingAction({ userId: emp._id, name: emp.name, status: emp.approvalStatus === 'APPROVED' ? 'REJECTED' : 'APPROVED' })}
                           className="w-full py-2.5 bg-white border border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-500 rounded-xl"
                         >
                           {emp.approvalStatus === 'APPROVED' ? 'Revoke Access' : 'Re-Approve'}
                         </button>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination for Accounts */}
        {activeTab === 'accounts' && accountTotalPages > 1 && (
          <div className="px-4 sm:px-8 py-4 bg-gray-50 border-t border-gray-100 flex flex-col xs:flex-row items-center justify-between gap-4">
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">
               Page <span className="text-gray-900">{accountPage}</span> of <span className="text-gray-900">{accountTotalPages}</span>
            </p>
            <div className="flex items-center gap-1.5">
               <button onClick={() => setAccountPage(p => Math.max(1, p-1))} disabled={accountPage === 1} className="p-2 bg-white border border-gray-200 rounded-xl disabled:opacity-30 shadow-sm transition-all active:scale-90 flex items-center justify-center">
                 <ChevronLeft className="w-3.5 h-3.5 text-gray-600"/>
               </button>
               
               <div className="flex items-center gap-1">
                 {(() => {
                   const pages = [];
                   const delta = 1;
                   const left = accountPage - delta;
                   const right = accountPage + delta;
                   
                   for (let i = 1; i <= accountTotalPages; i++) {
                     if (i === 1 || i === accountTotalPages || (i >= left && i <= right)) {
                       pages.push(i);
                     } else if (i === left - 1 || i === right + 1) {
                       pages.push('...');
                     }
                   }
                   
                   const uniquePages = pages.filter((item, pos, self) => self.indexOf(item) === pos);
                   
                   return uniquePages.map((pg, idx) => (
                     pg === '...' ? (
                       <span key={`ell-${idx}`} className="px-0.5 text-gray-400 font-bold text-[10px]">..</span>
                     ) : (
                       <button
                         key={pg}
                         onClick={() => setAccountPage(pg)}
                         className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl text-[10px] font-bold transition-all border ${
                           accountPage === pg 
                             ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                             : 'bg-white text-gray-400 border-gray-100 hover:text-indigo-600'
                         }`}
                       >
                         {pg}
                       </button>
                     )
                   ));
                 })()}
               </div>

               <button onClick={() => setAccountPage(p => Math.min(accountTotalPages, p+1))} disabled={accountPage === accountTotalPages} className="p-2 bg-white border border-gray-200 rounded-xl disabled:opacity-30 shadow-sm transition-all active:scale-90 flex items-center justify-center">
                 <ChevronRight className="w-3.5 h-3.5 text-gray-600"/>
               </button>
            </div>
          </div>
        )}
      </div>

      {confirmingAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/20 backdrop-blur-[2px]">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 animate-in fade-in zoom-in duration-200">
             <div className="flex flex-col items-center text-center">
               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${
                 confirmingAction.status === 'APPROVED' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-600'
               }`}>
                 {confirmingAction.status === 'APPROVED' ? <CheckCircle2 className="w-7 h-7" /> : <AlertCircle className="w-7 h-7" />}
               </div>
               
               <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-2">Confirm Account Review</h3>
               
               <div className="text-sm text-gray-500 font-medium leading-relaxed px-2">
                  Are you sure you want to <span className="text-indigo-600 font-extrabold">{confirmingAction.status.toLowerCase()}</span> access for
                  <p className="text-gray-900 font-extrabold text-base mt-1">{confirmingAction.name}</p>
               </div>

               <div className="grid grid-cols-2 gap-3 w-full mt-10">
                 <button
                   onClick={() => setConfirmingAction(null)}
                   className="py-3 px-4 rounded-xl bg-gray-50 text-gray-500 font-bold text-[13px] hover:bg-gray-100 transition-all active:scale-95"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={() => handleAccountAction(confirmingAction.userId, confirmingAction.status)}
                   className="py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold text-[13px] hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100"
                 >
                   Confirm
                 </button>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approvals;

