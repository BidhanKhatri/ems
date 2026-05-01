import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react';

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { resetPassword } = useAuthStore();
  
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const email = location.state?.email || '';
  const otp = location.state?.otp || '';

  useEffect(() => {
    if (!email || !otp) {
      toast.error('Session expired. Please start over.');
      navigate('/forgot-password');
    }
  }, [email, otp, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (formData.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      await resetPassword(email, otp, formData.password);
      toast.success('Password reset successfully! You can now login.');
      navigate('/login');
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Failed to reset password');
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
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight mb-2">Almost Done!</h1>
          <p className="text-sm text-gray-500 max-w-[260px] mx-auto leading-relaxed">
            Create a new strong password for <span className="font-semibold text-indigo-600">{email}</span>
          </p>
        </div>

        {/* Form Section */}
        <div className="px-8 pb-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-4 pl-12 bg-white/80 border border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-base md:text-sm text-gray-900 shadow-sm"
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-4 pl-12 bg-white/80 border border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-base md:text-sm text-gray-900 shadow-sm"
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold transition-all disabled:opacity-50 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 group transform active:scale-[0.98] mt-4"
            >
              {loading ? (
                'Securely Updating...'
              ) : (
                'Reset Password'
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

export default ResetPassword;
