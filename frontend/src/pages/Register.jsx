import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { toast } from 'sonner';
import { Mail, Lock, User, Shield } from 'lucide-react';
import AvatarSelector from '../components/AvatarSelector';
import FloatingInput from '../components/FloatingInput';

const Register = () => {
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '',
    profilePicture: '' 
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register } = useAuthStore();
  const navigate = useNavigate();

  const handleAvatarSelect = useCallback((avatarSrc) => {
    setFormData(prev => ({ ...prev, profilePicture: avatarSrc }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(formData);
      toast.success('Registration successful. Please check your email for OTP.');
      navigate('/verify-email', { state: { email: formData.email } });
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 to-purple-100 p-4">
      <div className="w-full max-w-5xl bg-white/20 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-auto min-h-[650px] lg:h-[720px] border border-white/30">

        {/* Left Panel */}
        <div className="hidden md:flex flex-col items-center justify-center w-1/2 p-10 bg-white/50 border-r border-white/20">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Join Us</h1>
          <p className="text-sm text-gray-500 mb-8">Create your account to get started</p>

          <div className="w-full space-y-3">
            <button
              type="button"
              className="flex items-center justify-center gap-3 w-full py-2.5 px-4 border border-gray-200 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-200"
            >
              Continue with Facebook
            </button>

            <button
              type="button"
              className="flex items-center justify-center gap-3 w-full py-2.5 px-4 border border-gray-200 rounded-xl bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
            >
              Continue with Google
            </button>
          </div>

          <div className="flex items-center gap-3 w-full mt-8">
            <div className="flex-1 h-px bg-gray-200/50" />
            <span className="text-xs text-gray-400">OR</span>
            <div className="flex-1 h-px bg-gray-200/50" />
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex flex-col items-center justify-center w-full md:w-1/2 p-10 bg-white/10 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-full border border-indigo-200 bg-white flex items-center justify-center mb-4 shadow-sm">
            <Shield className="w-5 h-5 text-indigo-500" />
          </div>

          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Create account
          </h2>

          <AvatarSelector onSelect={handleAvatarSelect} initialAvatar="emp_2.png" />

          <form className="w-full space-y-4 mt-2" onSubmit={handleSubmit}>
            <FloatingInput
              label="Full Name"
              icon={User}
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <FloatingInput
              label="Email Address"
              icon={Mail}
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <FloatingInput
              label="Password"
              icon={Lock}
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              showPasswordToggle={true}
              onTogglePassword={() => setShowPassword(!showPassword)}
              isPasswordVisible={showPassword}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-indigo-100"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-8 text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;