import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'sonner';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { Settings as SettingsIcon, Calendar as CalendarIcon, Save, Mail, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('schedules');
  const [showPassword, setShowPassword] = useState(false);

  // Schedule Settings State
  const [settings, setSettings] = useState({
    checkInTime: '09:00',
    checkOutTime: '17:00',
    earlyMargin: 5,
    lateMargin: 5,
    disableWeekends: true,
    activitySessionMinutes: 0,
    activityGraceMinutes: 5,
    activityMissPenaltyPoints: 8,
    adminWhatsAppNumber: '',
    smtpUser: '',
    smtpPass: '',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    approvalNotificationEmail: '',
  });
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Holiday Selection State
  const [holidays, setHolidays] = useState([]);
  const [range, setRange] = useState(undefined);
  const [holidayTitle, setHolidayTitle] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchHolidays();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/settings');
      if (data) setSettings(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load config');
    } finally {
      setLoadingConfig(false);
    }
  };

  const fetchHolidays = async () => {
    try {
      const { data } = await api.get('/settings/holidays');
      setHolidays(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load holidays');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await api.put('/settings', settings);
      toast.success('Core rules updated');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save rules');
    }
  };

  const handleCreateHoliday = async (e) => {
    e.preventDefault();
    if (!range?.from || !range?.to || !holidayTitle.trim()) {
      return toast.error('Please select a date range and provide a title');
    }

    try {
      const { data } = await api.post('/settings/holidays', {
        title: holidayTitle,
        startDate: range.from.toISOString(),
        endDate: range.to.toISOString()
      });
      setHolidays([...holidays, data]);
      setRange(undefined);
      setHolidayTitle('');
      toast.success('Holiday block added');
    } catch (error) {
      console.error(error);
      toast.error('Failed to mark holiday');
    }
  };

  const handleDeleteHoliday = async (id) => {
    try {
      await api.delete(`/settings/holidays/${id}`);
      setHolidays(holidays.filter(h => h._id !== id));
      toast.success('Holiday removed');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete holiday');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 pb-0">
        <h2 className="text-xl font-bold text-gray-900 mb-6">System Configuration</h2>
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('schedules')}
            className={`py-3 px-6 text-sm font-medium border-b-2 flex items-center transition-colors ${activeTab === 'schedules' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <SettingsIcon className="w-4 h-4 mr-2" /> Global Rules
          </button>
          <button
            onClick={() => setActiveTab('holidays')}
            className={`py-3 px-6 text-sm font-medium border-b-2 flex items-center transition-colors ${activeTab === 'holidays' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <CalendarIcon className="w-4 h-4 mr-2" /> Holiday Calendar
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`py-3 px-6 text-sm font-medium border-b-2 flex items-center transition-colors ${activeTab === 'email' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <Mail className="w-4 h-4 mr-2" /> Email Setup
          </button>
        </div>
      </div>

      {activeTab === 'schedules' && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          {loadingConfig ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="ml-3 text-gray-500 font-medium">Loading rules...</p>
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Column 1: Core Attendance Rules */}
                <div className="space-y-6">
                  <div className="pb-2 border-b border-gray-100 flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                      <SettingsIcon className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Attendance Rules</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Standard Check-In</label>
                      <input
                        type="time"
                        required
                        value={settings.checkInTime}
                        onChange={(e) => setSettings({ ...settings, checkInTime: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Standard Check-Out</label>
                      <input
                        type="time"
                        required
                        value={settings.checkOutTime || '17:00'}
                        onChange={(e) => setSettings({ ...settings, checkOutTime: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center">
                        Early Margin <span className="text-[10px] text-gray-400 font-normal ml-1">(mins)</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={settings.earlyMargin}
                        onChange={(e) => setSettings({ ...settings, earlyMargin: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                      <p className="text-[11px] text-gray-400 mt-1.5 leading-tight">Tolerance before the time to be considered early.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center">
                        Late Margin <span className="text-[10px] text-gray-400 font-normal ml-1">(mins)</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={settings.lateMargin}
                        onChange={(e) => setSettings({ ...settings, lateMargin: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                      <p className="text-[11px] text-gray-400 mt-1.5 leading-tight">Buffer time before being marked as late.</p>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="weekends"
                      checked={settings.disableWeekends}
                      onChange={(e) => setSettings({ ...settings, disableWeekends: e.target.checked })}
                      className="w-5 h-5 text-primary rounded-md border-gray-300 focus:ring-primary transition-all"
                    />
                    <label htmlFor="weekends" className="text-sm font-medium text-gray-700">
                      Automatically Block Weekends
                    </label>
                  </div>
                </div>

                {/* Column 2: Employee Activity Tracking */}
                <div className="space-y-6 lg:border-l lg:border-gray-100 lg:pl-10">
                  <div className="pb-2 border-b border-gray-100 flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center mr-3">
                      <CalendarIcon className="w-4 h-4 text-orange-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Activity Tracking</h3>
                  </div>

                  <p className="text-sm text-gray-500 leading-relaxed italic">
                    Require employees to periodically confirm they are active during work hours.
                  </p>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Session Duration</label>
                      <select
                        value={settings.activitySessionMinutes || 0}
                        onChange={(e) => setSettings({ ...settings, activitySessionMinutes: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      >
                        <option value={0}>Disabled</option>
                        <option value={1}>1 Minute (Test)</option>
                        <option value={30}>30 Minutes</option>
                        <option value={60}>1 Hour</option>
                        <option value={120}>2 Hours</option>
                        <option value={180}>3 Hours</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center">
                        Grace Window <span className="text-[10px] text-gray-400 font-normal ml-1">(mins)</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={settings.activityGraceMinutes || 0}
                        onChange={(e) => setSettings({ ...settings, activityGraceMinutes: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Miss Penalty</label>
                      <input
                        type="number"
                        min={1}
                        value={settings.activityMissPenaltyPoints || 8}
                        onChange={(e) => setSettings({ ...settings, activityMissPenaltyPoints: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                      <p className="text-[11px] text-gray-400 mt-1.5 leading-tight">Points deducted from performance for missed checks.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Admin WhatsApp</label>
                      <input
                        type="text"
                        placeholder="+15551234567"
                        value={settings.adminWhatsAppNumber || ''}
                        onChange={(e) => setSettings({ ...settings, adminWhatsAppNumber: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                      <p className="text-[11px] text-gray-400 mt-1.5 leading-tight">Used for automated alerts on missed activity.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-primary text-white px-8 py-3 rounded-xl shadow-lg shadow-primary/20 font-bold hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center group"
                >
                  <Save className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" /> Save Global Configuration
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {activeTab === 'email' && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          {loadingConfig ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="ml-3 text-gray-500 font-medium">Loading config...</p>
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-8">
              <div className="space-y-6">
                <div className="pb-4 flex items-center border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mr-3">
                    <Mail className="w-4 h-4 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Email Configuration (SMTP)</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sender Gmail Address</label>
                      <input
                        type="email"
                        placeholder="your-email@gmail.com"
                        value={settings.smtpUser || ''}
                        onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900"
                      />
                      <p className="text-[11px] text-gray-400 mt-2 leading-tight">All system notifications will be sent from this account.</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Gmail App Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="xxxx xxxx xxxx xxxx"
                          value={settings.smtpPass || ''}
                          onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pr-12 text-gray-900"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <p className="text-[11px] text-amber-700 leading-normal font-medium">
                          <strong>Required:</strong> Use a Google "App Password" (16 characters), NOT your regular Gmail password. 
                          You must enable 2-Step Verification to generate one.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notification Receiver Email</label>
                      <input
                        type="email"
                        placeholder="admin-notifications@company.com"
                        value={settings.approvalNotificationEmail || ''}
                        onChange={(e) => setSettings({ ...settings, approvalNotificationEmail: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900"
                      />
                      <p className="text-[11px] text-gray-400 mt-2 leading-tight">This email will receive alerts when an employee's late check-in requires approval.</p>
                    </div>
                  </div>

                  <div className="space-y-4 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Advanced Connection Settings</h4>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">SMTP Host</label>
                      <input
                        type="text"
                        value={settings.smtpHost || 'smtp.gmail.com'}
                        onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">SMTP Port</label>
                      <input
                        type="number"
                        value={settings.smtpPort || 465}
                        onChange={(e) => setSettings({ ...settings, smtpPort: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                      <p className="text-[10px] text-gray-400 mt-1.5 font-medium">Port 465 (SSL) is recommended for Gmail.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-primary text-white px-10 py-3.5 rounded-xl shadow-lg shadow-primary/20 font-bold hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center group"
                >
                  <Save className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" /> Save Email Configuration
                </button>
              </div>
            </form>
          )}
        </div>
      )}


      {activeTab === 'holidays' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-lg mb-4">Select Dates to Mark</h3>
            <p className="text-sm text-gray-500 mb-4 tracking-tight">Click and drag to select a range of days.</p>

            <div className="flex justify-center border border-gray-100 rounded-xl p-4 bg-gray-50">
              <DayPicker
                mode="range"
                selected={range}
                onSelect={setRange}
                className="bg-white rounded p-2"
              />
            </div>

            <form onSubmit={handleCreateHoliday} className="mt-6 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Holiday Summary (e.g. Dashain)..."
                required
                value={holidayTitle}
                onChange={(e) => setHolidayTitle(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary"
              />
              <button
                type="submit"
                className="bg-primary text-white px-6 py-2.5 font-bold rounded-lg hover:bg-primary/90 shadow whitespace-nowrap"
              >
                Apply Range
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-y-auto max-h-[600px]">
            <h3 className="font-bold text-lg mb-4">Active Calendar Blocks</h3>
            {holidays.length === 0 ? (
              <div className="text-center text-gray-400 py-10 italic">No manual holidays mapped.</div>
            ) : (
              <div className="space-y-3">
                {holidays.map(h => (
                  <div key={h._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                    <div>
                      <p className="font-bold text-gray-800">{h.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {format(new Date(h.startDate), 'MMM dd')} - {format(new Date(h.endDate), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteHoliday(h._id)}
                      className="mt-2 sm:mt-0 text-danger hover:underline text-sm font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
