import { useEffect, useState, useRef, useCallback } from 'react';
import { UserCircle2, Mail, Save, ShieldCheck, Camera, Trash2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';
import AvatarSelector from '../components/AvatarSelector';

const Profile = () => {
  const { user, setUser } = useAuthStore();
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', profilePicture: '' });
  const fileInputRef = useRef(null);

  useEffect(() => {
    setProfileForm({
      name: user?.name || '',
      email: user?.email || '',
      profilePicture: user?.profilePicture || '',
    });
  }, [user]);

  useEffect(() => {
    const fetchProfile = async () => {
      setProfileLoading(true);
      try {
        const { data } = await api.get('/users/profile');
        if (data) {
          setUser(data);
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

  const handleAvatarSelect = useCallback((avatarSrc) => {
    setProfileForm(prev => ({ ...prev, profilePicture: avatarSrc }));
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();

    const cleaned = {
      name: profileForm.name.trim(),
      email: profileForm.email.trim(),
      profilePicture: profileForm.profilePicture
    };

    if (!cleaned.name || !cleaned.email) {
      toast.error('Name and email are required');
      return;
    }

    if (cleaned.name === user?.name && cleaned.email === user?.email && cleaned.profilePicture === user?.profilePicture) {
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return toast.error('Please upload an image file');
    }

    if (file.size > 5 * 1024 * 1024) {
      return toast.error('Image size should be less than 5MB');
    }

    const formData = new FormData();
    formData.append('image', file);

    setImgUploading(true);
    try {
      const { data } = await api.post('/users/profile/picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUser({ ...user, profilePicture: data.profilePicture });
      toast.success('Profile picture updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setImgUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!window.confirm('Remove profile picture?')) return;

    setImgUploading(true);
    try {
      await api.delete('/users/profile/picture');
      setUser({ ...user, profilePicture: null });
      toast.success('Profile picture removed');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed');
    } finally {
      setImgUploading(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="relative overflow-hidden rounded-2xl bg-[#FAF8F5] px-6 py-5 shadow-sm border border-stone-200">
        <div className="absolute top-0 right-0 -translate-y-8 translate-x-8 opacity-20 pointer-events-none">
          <svg width="140" height="140" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="100" fill="#e7d8cc" />
          </svg>
        </div>
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-stone-800 tracking-tight leading-tight">
              My Profile
            </h1>
            <p className="text-stone-500 mt-1 text-sm font-medium">
              Manage your account details and profile identity.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white border border-stone-200 px-4 py-2 rounded-xl shadow-sm">
            <div className="bg-emerald-100 p-1.5 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-xs font-semibold text-stone-700">Verified Profile</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Picture Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#FAF8F5] p-6 rounded-2xl shadow-sm border border-stone-200 flex flex-col items-center">
            <div className="relative group">
              <div className="w-40 h-40 rounded-full border-4 border-white shadow-xl overflow-hidden bg-stone-200 flex items-center justify-center transition-all duration-300 group-hover:scale-[1.02]">
                {user?.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserCircle2 className="w-20 h-20 text-stone-400" />
                )}
                {imgUploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 right-2 p-2.5 bg-amber-800 text-white rounded-full shadow-lg hover:bg-amber-900 transition-all hover:scale-110 active:scale-95"
                disabled={imgUploading}
              >
                <Camera className="w-5 h-5" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
                accept="image/*"
              />
            </div>

            <div className="mt-6 w-full space-y-3">
              <div className="text-center">
                <h3 className="font-bold text-stone-800">{user?.name}</h3>
                <p className="text-xs text-stone-500 font-medium">{user?.email}</p>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors"
                  disabled={imgUploading}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Update Photo
                </button>
                {user?.profilePicture && (
                  <button
                    onClick={handleDeleteImage}
                    className="inline-flex items-center justify-center p-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 transition-colors"
                    disabled={imgUploading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-center text-stone-400 font-medium px-2">
                JPG, JPEG or PNG. Max size 5MB.
              </p>
            </div>
          </div>

          <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100/50">
            <h4 className="text-xs font-black text-amber-800 uppercase tracking-widest mb-3">Account Status</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 font-medium">Role</span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">{user?.role}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 font-medium">Status</span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Info Section */}
        <div className="lg:col-span-2">
          <div className="bg-[#FAF8F5] p-8 rounded-2xl shadow-sm border border-stone-200 h-full">
            <div className="mb-8">
              <h3 className="text-lg font-bold text-stone-800">Basic Settings</h3>
              <p className="text-sm text-stone-500 mt-1">Personalize your identity in the management system.</p>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2.5 ml-1">Full Name</label>
                  <div className="relative">
                    <UserCircle2 className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => handleProfileChange('name', e.target.value)}
                      className="w-full h-12 rounded-xl border border-stone-200 bg-white pl-10 pr-4 text-sm text-stone-800 focus:outline-none focus:ring-4 focus:ring-amber-100 focus:border-amber-300 transition-all"
                      placeholder="Your name"
                      disabled={profileLoading || profileSaving}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2.5 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => handleProfileChange('email', e.target.value)}
                      className="w-full h-12 rounded-xl border border-stone-200 bg-white pl-10 pr-4 text-sm text-stone-800 focus:outline-none focus:ring-4 focus:ring-amber-100 focus:border-amber-300 transition-all"
                      placeholder="Your email"
                      disabled={profileLoading || profileSaving}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-stone-100 flex items-center justify-between">
                <p className="text-xs text-stone-400 italic">Last profile update: {new Date().toLocaleDateString()}</p>
                <button
                  type="submit"
                  disabled={profileLoading || profileSaving}
                  className="inline-flex items-center gap-2 px-6 h-12 rounded-2xl bg-amber-800 text-white font-bold hover:bg-amber-900 shadow-lg shadow-amber-100 disabled:opacity-60 transition-all active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  {profileSaving ? 'Updating...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
