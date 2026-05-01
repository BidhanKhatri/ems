import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { toast } from 'sonner';
import { Mail, ArrowLeft, ShieldQuestion } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { forgotPassword } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      toast.success('Password reset code sent to your email');
      navigate('/verify-reset-otp', { state: { email } });
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 to-purple-100 p-4 font-sans">
      <div className="w-full max-w-md bg-white/40 backdrop-blur-md rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
        
        {/* Header Section */}
        <div className="p-8 text-center bg-white/20">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200">
            <ShieldQuestion className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight mb-2">Forgot Password?</h1>
          <p className="text-sm text-gray-500 max-w-[260px] mx-auto leading-relaxed">
            Enter your email address and we'll send you a 4-digit code to reset your password.
          </p>
        </div>

        {/* Form Section */}
        <div className="px-8 pb-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-4 pl-12 bg-white/80 border border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-base md:text-sm text-gray-900 shadow-sm"
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold transition-all disabled:opacity-50 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 group transform active:scale-[0.98]"
            >
              {loading ? (
                'Sending OTP...'
              ) : (
                <>
                  Get Reset Code
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100/50 flex items-center justify-center">
             <Link to="/login" className="flex items-center gap-2 text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-colors">
                <ArrowLeft size={14} />
                Back to Login
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
