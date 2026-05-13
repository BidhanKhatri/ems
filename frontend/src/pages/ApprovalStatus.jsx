import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { Shield, Clock, XCircle, Mail, Phone, LogOut } from 'lucide-react';

const ApprovalStatus = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const isRejected = user.approvalStatus === 'REJECTED';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 to-purple-100 p-4">
      <div className="w-full max-w-2xl bg-white/40 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-300">
        <div className="p-8 md:p-12 text-center">
          <div className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center mb-8 shadow-lg ${
            isRejected ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-indigo-50 text-indigo-500 border border-indigo-100'
          }`}>
            {isRejected ? <XCircle className="w-10 h-10" /> : <Clock className="w-10 h-10 animate-pulse" />}
          </div>

          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-4">
            {isRejected ? 'Account Rejected' : 'Approval Pending'}
          </h1>

          <p className="text-gray-600 font-medium leading-relaxed mb-10 max-w-md mx-auto">
            {isRejected
              ? "Sorry, your account application has been rejected by the administrator. You do not have access to the system at this time."
              : "Welcome, " + user.name + "! Your account has been registered successfully. Please wait while our administrators verify your details and approve your access."
            }
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 text-left">
            <div className="bg-white/50 p-6 rounded-2xl border border-white/40 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 shadow-inner">
                <Mail className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] uppercase font-bold text-gray-400 tracking-widest leading-none mb-1">Email Support</p>
                <p className="text-sm font-bold text-gray-700 truncate">support@ems.com</p>
              </div>
            </div>
            <div className="bg-white/50 p-6 rounded-2xl border border-white/40 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 shadow-inner">
                <Phone className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] uppercase font-bold text-gray-400 tracking-widest leading-none mb-1">Call Helpline</p>
                <p className="text-sm font-bold text-gray-700 truncate">+1 234 567 890</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-100"
          >
            <LogOut className="w-4 h-4" />
            Sign Out & Re-login
          </button>
        </div>
        
        <div className="bg-gray-50/50 px-8 py-4 border-t border-gray-100 flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
           <div className="flex items-center gap-2">
             <Shield className="w-3.5 h-3.5" />
             <span>EMS Secure Portal</span>
           </div>
           <span>v2.4.0</span>
        </div>
      </div>
    </div>
  );
};

export default ApprovalStatus;
