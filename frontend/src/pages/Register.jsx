import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { toast } from 'sonner';
import { Mail, Lock, User } from 'lucide-react';
import AvatarSelector from '../components/AvatarSelector';
import FloatingInput from '../components/FloatingInput';
import logo from '../assets/ems-logo.png';

const Register = () => {
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '',
    confirmPassword: '',
    profilePicture: '' 
  });
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register } = useAuthStore();
  const navigate = useNavigate();

  const handleAvatarSelect = useCallback((avatarSrc) => {
    setFormData(prev => ({ ...prev, profilePicture: avatarSrc }));
  }, []);

  const validatePassword = (pass) => {
    if (!pass) return '';
    if (pass.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(pass)) return 'Password must contain a capital letter';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) return 'Password must contain a symbol';
    return '';
  };

  const validateEmail = (email) => {
    if (!email) return '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return '';
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setFormData({ ...formData, email: val });
    setEmailError(validateEmail(val));
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setFormData({ ...formData, password: val });
    setPasswordError(validatePassword(val));
    if (formData.confirmPassword) {
      setConfirmPasswordError(val !== formData.confirmPassword ? 'Passwords do not match' : '');
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const val = e.target.value;
    setFormData({ ...formData, confirmPassword: val });
    setConfirmPasswordError(val && formData.password !== val ? 'Passwords do not match' : '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (emailError) {
      toast.error('Please provide a valid email address.');
      return;
    }
    if (passwordError) {
      toast.error('Please fix the password errors before submitting.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // Exclude confirmPassword from the payload sent to the backend
      const { confirmPassword, ...payload } = formData;
      await register(payload);
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
      <div className="w-full max-w-5xl bg-white/20 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-auto md:min-h-[650px] lg:min-h-[720px] border border-white/30">

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
          <div className="w-20 h-20 flex items-center justify-center mb-6 rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden p-2 group transition-transform hover:scale-105">
            <img src={logo} alt="EMS Logo" className="w-full h-full object-contain" />
          </div>

          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Create account
          </h2>

          <AvatarSelector onSelect={handleAvatarSelect} initialAvatar="emp_2.png" />

          <form className="w-full space-y-5 sm:space-y-6 mt-4" onSubmit={handleSubmit}>
            <FloatingInput
              label="Full Name"
              icon={User}
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <div className="flex flex-col gap-1">
              <FloatingInput
                label="Email Address"
                icon={Mail}
                type="email"
                required
                value={formData.email}
                onChange={handleEmailChange}
              />
              {emailError && (
                <p className="text-[11px] font-medium text-red-500 pl-2 animate-in slide-in-from-top-1">
                  {emailError}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <FloatingInput
                label="Password"
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={handlePasswordChange}
                showPasswordToggle={true}
                onTogglePassword={() => setShowPassword(!showPassword)}
                isPasswordVisible={showPassword}
              />
              {passwordError && (
                <p className="text-[11px] font-medium text-red-500 pl-2 animate-in slide-in-from-top-1">
                  {passwordError}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <FloatingInput
                label="Confirm Password"
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.confirmPassword}
                onChange={handleConfirmPasswordChange}
              />
              {confirmPasswordError && (
                <p className="text-[11px] font-medium text-red-500 pl-2 animate-in slide-in-from-top-1">
                  {confirmPasswordError}
                </p>
              )}
            </div>

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