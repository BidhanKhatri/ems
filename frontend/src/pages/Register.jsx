import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { toast } from 'sonner';
import { Eye, EyeOff, Shield } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register } = useAuthStore();
  const navigate = useNavigate();

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
      <div className="w-full max-w-5xl bg-white/10 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden flex h-[650px]">

        {/* Left Panel */}
        <div className="hidden md:flex flex-col items-center justify-center w-1/2 p-10 bg-white/50">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Join Us</h1>
          <p className="text-sm text-gray-500 mb-8">Create your account to get started</p>

          <div className="w-full space-y-3">

            {/* Facebook */}
            <button
              type="button"
              className="flex items-center justify-center gap-3 w-full py-2.5 px-4 border border-gray-200 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Continue with Facebook
            </button>

            {/* Google */}
            <button
              type="button"
              className="flex items-center justify-center gap-3 w-full py-2.5 px-4 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Continue with Google
            </button>

          </div>

          <div className="flex items-center gap-3 w-full mt-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex flex-col items-center justify-center w-full md:w-1/2 p-10 bg-white/30">
          <div className="w-12 h-12 rounded-full border border-indigo-200 bg-indigo-50 flex items-center justify-center mb-6">
            <Shield className="w-5 h-5 text-indigo-500" />
          </div>

          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Create account
          </h2>

          <form className="w-full space-y-4" onSubmit={handleSubmit}>

            <input
              type="text"
              required
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />

            <input
              type="email"
              required
              placeholder="Email address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />

            {/* Password with toggle */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>

          </form>

          <p className="mt-6 text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-500 hover:text-indigo-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Register;