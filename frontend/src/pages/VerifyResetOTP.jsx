import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { toast } from 'sonner';
import { ArrowLeft, RefreshCw, Timer } from 'lucide-react';
import logo from '../assets/ems-logo.png';

const VerifyResetOTP = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyResetOTP, forgotPassword } = useAuthStore();
  
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];
  const email = location.state?.email || '';

  // Handle countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      toast.error('No email found. Please start over.');
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  const handleChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Move to next input if value is entered
    if (value && index < 3) {
      inputRefs[index + 1].current.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Move to previous input on backspace if current is empty
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const data = e.clipboardData.getData('text').slice(0, 4);
    if (!/^\d+$/.test(data)) return;
    
    const newOtp = [...otp];
    data.split('').forEach((char, index) => {
      if (index < 4) newOtp[index] = char;
    });
    setOtp(newOtp);
    
    // Focus last or next empty
    const nextIndex = data.length < 4 ? data.length : 3;
    inputRefs[nextIndex].current.focus();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length < 4) {
      return toast.error('Please enter the full 4-digit OTP');
    }

    setLoading(true);
    try {
      await verifyResetOTP(email, otpValue);
      toast.success('OTP verified successfully!');
      // Navigate to reset password page with email and otp
      navigate('/reset-password', { state: { email, otp: otpValue } });
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Verification failed');
      if (error?.response?.data?.message?.toLowerCase().includes('expired')) {
        setCanResend(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await forgotPassword(email);
      toast.success('New reset code sent to your email');
      setOtp(['', '', '', '']);
      setTimeLeft(120);
      setCanResend(false);
      inputRefs[0].current.focus();
    } catch (error) {
      toast.error('Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  // Automatically submit when all 4 boxes are filled
  useEffect(() => {
    if (otp.every(val => val !== '') && otp.join('').length === 4) {
       const timeout = setTimeout(() => handleSubmit(), 200);
       return () => clearTimeout(timeout);
    }
  }, [otp]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 to-purple-100 p-4 font-sans">
      <div className="w-full max-w-md bg-white/40 backdrop-blur-md rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
        
        {/* Header Section */}
        <div className="p-8 text-center bg-white/20">
          <div className="w-24 h-24 flex items-center justify-center mx-auto mb-6 rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden p-1">
            <img src={logo} alt="EMS Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight mb-2">Security Check</h1>
          <p className="text-sm text-gray-500 max-w-[240px] mx-auto leading-relaxed">
            Enter the 4-digit reset code sent to <span className="font-semibold text-indigo-600">{email}</span>
          </p>
        </div>

        {/* Input Section */}
        <div className="px-8 pb-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex justify-center gap-4">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={inputRefs[index]}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-14 h-16 text-center text-2xl font-bold bg-white/80 border border-gray-100 rounded-2xl focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none text-gray-900 shadow-sm"
                />
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 py-2">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${timeLeft > 0 ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                <Timer size={14} />
                <span>{timeLeft > 0 ? formatTime(timeLeft) : 'Expired'}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.join('').length < 4}
              className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all disabled:opacity-50 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 group transform active:scale-[0.98]"
            >
              {loading ? (
                <RefreshCw className="animate-spin" size={18} />
              ) : (
                'Verify Code'
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-sm text-gray-400 mb-4">Didn’t receive the code?</p>
            <button
              onClick={handleResend}
              disabled={!canResend || resending}
              className={`flex items-center justify-center gap-2 mx-auto px-6 py-2 rounded-xl text-sm font-bold transition-all ${canResend ? 'text-indigo-600 hover:bg-indigo-50 active:scale-95' : 'text-gray-300 cursor-not-allowed'}`}
            >
              <RefreshCw className={resending ? 'animate-spin' : ''} size={16} />
              {resending ? 'Sending...' : 'Resend Code'}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100/50 flex items-center justify-center">
             <Link to="/forgot-password" className="flex items-center gap-2 text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-colors">
                <ArrowLeft size={14} />
                Change Email
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyResetOTP;
