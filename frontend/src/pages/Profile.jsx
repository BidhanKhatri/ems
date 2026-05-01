import { useEffect, useState } from 'react';
import { UserCircle2, Mail, Save, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';

const Profile = () => {
  const { user, setUser } = useAuthStore();
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });

  useEffect(() => {
    setProfileForm({
      name: user?.name || '',
      email: user?.email || '',
    });
  }, [user]);

  useEffect(() => {
    const fetchProfile = async () => {
      setProfileLoading(true);
      try {
        const { data } = await api.get('/auth/me');
        if (data?.user) {
          setUser(data.user);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load profile');
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, [setUser]);

  const handleProfileChange = (field, value) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();

    const cleaned = {
      name: profileForm.name.trim(),
      email: profileForm.email.trim(),
    };

    if (!cleaned.name || !cleaned.email) {
      toast.error('Name and email are required');
      return;
    }

    if (cleaned.name === user?.name && cleaned.email === user?.email) {
      toast.info('No profile changes to save');
      return;
    }

    setProfileSaving(true);
    try {
      const { data } = await api.patch('/auth/me', cleaned);
      setUser(data.user);
      toast.success(data.message || 'Profile updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="relative overflow-hidden rounded-2xl bg-[#FAF8F5] px-6 py-5 shadow-sm border border-stone-200">
        {/* Soft creamy accents */}
        <div className="absolute top-0 right-0 -translate-y-8 translate-x-8 opacity-20 pointer-events-none">
          <svg width="140" height="140" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="100" fill="#e7d8cc" />
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 opacity-20 pointer-events-none">
          <svg width="180" height="180" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="100" fill="#f1e7df" />
          </svg>
        </div>

        <div className="relative z-10 flex items-center justify-between gap-4">
          {/* Left content */}
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-stone-800 tracking-tight leading-tight">
              My Profile
            </h1>
            <p className="text-stone-500 mt-1 text-sm font-medium">
              Manage your account details and keep your information current.
            </p>
          </div>

          {/* Right badge */}
          <div className="hidden sm:flex items-center gap-2 bg-white border border-stone-200 px-4 py-2 rounded-xl shadow-sm">
            <div className="bg-emerald-100 p-1.5 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-xs font-semibold text-stone-700">
              Secure Profile
            </span>
          </div>
        </div>
      </div>

      <div className="bg-[#FAF8F5] p-6 rounded-2xl shadow-sm border border-stone-200">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <div className="lg:w-1/3 bg-[#F2EFE9] border border-stone-200 rounded-xl p-5">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-200/70 shadow-inner mb-4">
              <UserCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-800">Profile Information</h3>
            <p className="text-sm text-stone-600 mt-2 leading-relaxed">
              Your profile details are used across attendance records and portal identity.
            </p>
            <div className="mt-5 pt-4 border-t border-stone-300/70">
              <p className="text-[11px] uppercase tracking-widest font-bold text-stone-500">Current Role</p>
              <p className="text-sm font-semibold text-stone-700 mt-1">{user?.role}</p>
            </div>
          </div>

          <form onSubmit={handleProfileSave} className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">Full Name</label>
                <div className="relative">
                  <UserCircle2 className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => handleProfileChange('name', e.target.value)}
                    className="w-full h-11 rounded-xl border border-stone-300 bg-[#FCFBF8] pl-10 pr-4 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 transition"
                    placeholder="Enter your full name"
                    disabled={profileLoading || profileSaving}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    className="w-full h-11 rounded-xl border border-stone-300 bg-[#FCFBF8] pl-10 pr-4 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 transition"
                    placeholder="Enter your email"
                    disabled={profileLoading || profileSaving}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end mt-5">
              <button
                type="submit"
                disabled={profileLoading || profileSaving}
                className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-amber-800 text-amber-50 text-sm font-semibold hover:bg-amber-900 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4" />
                {profileSaving ? 'Saving...' : profileLoading ? 'Loading...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
