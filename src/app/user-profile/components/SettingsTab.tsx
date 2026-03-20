'use client';

import { useState, useEffect } from 'react';
import { Loader2, Check, Bell, BellOff, AlertTriangle, Shield, Trash2, X, Mail, Key, LogOut, Info, Sun, Moon, Monitor, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900
        ${checked ? 'bg-violet-600' : 'bg-zinc-700'}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg
          transition duration-200 ease-in-out
          ${checked ? 'translate-x-4' : 'translate-x-0'}
        `}
      />
    </button>
  );
}

function ConfirmModal({
  isOpen, onClose, onConfirm, title, description, confirmLabel, loading,
}: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void;
  title: string; description: string; confirmLabel: string; loading: boolean;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl shadow-black/60 animate-fade-in p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-300 transition-colors">
          <X size={16} />
        </button>
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/15 border border-red-500/25">
            <AlertTriangle size={16} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-700 text-zinc-100">{title}</h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="flex gap-2.5 justify-end">
          <button onClick={onClose} className="h-8 px-4 rounded-lg bg-zinc-800 border border-zinc-700/50 text-xs font-500 text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-60 text-xs font-600 text-white transition-colors">
            {loading && <Loader2 size={12} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

type ThemeMode = 'dark' | 'light' | 'system';

export default function SettingsTab() {
  const { user, signOut } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushRequesting, setPushRequesting] = useState(false);
  const [activeSection, setActiveSection] = useState<'account' | 'preferences' | 'about'>('account');

  const [notifyBefore, setNotifyBefore] = useState(true);
  const [notifyMinutes, setNotifyMinutes] = useState('10');
  const [notifyWeeklySummary, setNotifyWeeklySummary] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  const [showFreePeriods, setShowFreePeriods] = useState(true);
  const [showTeacherNames, setShowTeacherNames] = useState(true);
  const [showRoomNumbers, setShowRoomNumbers] = useState(true);
  const [defaultView, setDefaultView] = useState('weekly');
  const [highlightToday, setHighlightToday] = useState(true);
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

  // About section accordion
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  // Account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    setPushSupported('Notification' in window && 'serviceWorker' in navigator);
    if (user) fetchPreferences();
  }, [user]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light-theme');
    if (themeMode === 'light') {
      root.classList.add('light-theme');
      localStorage.setItem('app-theme', 'light');
    } else if (themeMode === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('app-theme', 'dark');
    } else {
      // system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.add('light-theme');
      }
      localStorage.setItem('app-theme', 'system');
    }
  }, [themeMode]);

  const fetchPreferences = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setNotifyBefore(data.notify_before_class ?? true);
        setNotifyMinutes(String(data.notify_minutes_before ?? 10));
        setNotifyWeeklySummary(data.notify_weekly_summary ?? false);
        setPushEnabled(data.push_notifications_enabled ?? false);
        setShowFreePeriods(data.show_free_periods ?? true);
        setShowTeacherNames(data.show_teacher_names ?? true);
        setShowRoomNumbers(data.show_room_numbers ?? true);
        setDefaultView(data.default_view ?? 'weekly');
        setHighlightToday(data.highlight_today ?? true);
      }
      // Load theme from localStorage (not stored in DB)
      const savedTheme = localStorage.getItem('app-theme') as ThemeMode | null;
      if (savedTheme && ['dark', 'light', 'system'].includes(savedTheme)) {
        setThemeMode(savedTheme);
      }
    } catch {}
    setLoading(false);
  };

  const handleEnablePushNotifications = async () => {
    if (!pushSupported || !user) return;
    setPushRequesting(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPushEnabled(true);
        await supabase.from('user_preferences').upsert({ user_id: user.id, push_notifications_enabled: true }, { onConflict: 'user_id' });
        toast.success('Push notifications enabled!');
        setTimeout(() => {
          new Notification('ClassScheduler', {
            body: "Push notifications are now active! You'll be reminded before each class.",
            icon: '/favicon.ico',
          });
        }, 1000);
      } else if (permission === 'denied') {
        toast.error('Notification permission denied. Please enable it in your browser settings.');
      }
    } catch {
      toast.error('Failed to enable push notifications.');
    }
    setPushRequesting(false);
  };

  const handleDisablePushNotifications = async () => {
    if (!user) return;
    setPushEnabled(false);
    await supabase.from('user_preferences').upsert({ user_id: user.id, push_notifications_enabled: false }, { onConflict: 'user_id' });
    toast.success('Push notifications disabled.');
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('user_preferences').upsert({
        user_id: user.id,
        notify_before_class: notifyBefore,
        notify_minutes_before: parseInt(notifyMinutes),
        notify_weekly_summary: notifyWeeklySummary,
        push_notifications_enabled: pushEnabled,
        show_free_periods: showFreePeriods,
        show_teacher_names: showTeacherNames,
        show_room_numbers: showRoomNumbers,
        default_view: defaultView,
        highlight_today: highlightToday,
      }, { onConflict: 'user_id' });
      setSaved(true);
      toast.success('Preferences saved successfully.');
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error('Failed to save preferences.');
    }
    setSaving(false);
  };

  const handleReset = () => {
    setNotifyBefore(true);
    setNotifyMinutes('10');
    setNotifyWeeklySummary(false);
    setShowFreePeriods(true);
    setShowTeacherNames(true);
    setShowRoomNumbers(true);
    setDefaultView('weekly');
    setHighlightToday(true);
    setThemeMode('dark');
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      if (user) {
        await supabase.from('timetable_entries').delete().eq('user_id', user.id);
        await supabase.from('subjects').delete().eq('user_id', user.id);
        await supabase.from('user_profiles').delete().eq('id', user.id);
      }
      await signOut();
      router.push('/sign-up-login-screen');
      toast.error('Account deleted successfully.');
    } catch {
      toast.error('Failed to delete account. Please try again.');
    }
    setDeleteLoading(false);
    setShowDeleteModal(false);
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (!newPassword || newPassword.length < 6) { setPasswordError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match.'); return; }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password.');
    }
    setChangingPassword(false);
  };

  const inputClass = "w-full h-9 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-100 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors placeholder:text-zinc-600";

  const toggleAccordion = (key: string) => setOpenAccordion(openAccordion === key ? null : key);

  const THEME_OPTIONS: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'dark', label: 'Dark', icon: <Moon size={14} /> },
    { value: 'light', label: 'Light', icon: <Sun size={14} /> },
    { value: 'system', label: 'System', icon: <Monitor size={14} /> },
  ];

  return (
    <>
      <Toaster position="bottom-right" theme="dark" richColors />
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title="Permanently delete your account?"
        description="This will immediately and irreversibly delete your ClassScheduler profile, all subjects, timetable entries, and preferences."
        confirmLabel="Delete Account"
        loading={deleteLoading}
      />

      {/* Section switcher */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg bg-zinc-800/40 border border-zinc-800/60 w-fit">
        <button
          onClick={() => setActiveSection('account')}
          className={`px-4 py-1.5 rounded-md text-sm font-500 transition-colors ${activeSection === 'account' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          Account
        </button>
        <button
          onClick={() => setActiveSection('preferences')}
          className={`px-4 py-1.5 rounded-md text-sm font-500 transition-colors ${activeSection === 'preferences' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          Preferences
        </button>
        <button
          onClick={() => setActiveSection('about')}
          className={`px-4 py-1.5 rounded-md text-sm font-500 transition-colors ${activeSection === 'about' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          About
        </button>
      </div>

      {activeSection === 'preferences' && (
        <div className="space-y-6 max-w-2xl">
          {/* Theme */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800/60">
              <h3 className="text-sm font-600 text-zinc-100">Theme</h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">Choose your preferred appearance.</p>
            </div>
            <div className="px-5 py-4">
              <div className="flex gap-2">
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setThemeMode(opt.value)}
                    className={`flex-1 flex flex-col items-center gap-2 py-3 px-2 rounded-lg border text-xs font-500 transition-colors ${themeMode === opt.value ? 'bg-violet-600/20 border-violet-500/40 text-violet-300' : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/40'}`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Push Notifications */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800/60">
              <h3 className="text-sm font-600 text-zinc-100">Push Notifications</h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">Get browser notifications for class reminders.</p>
            </div>
            <div className="px-5 py-4">
              {!pushSupported ? (
                <div className="flex items-center gap-3 rounded-lg bg-zinc-800/40 border border-zinc-700/40 px-4 py-3">
                  <BellOff size={15} className="text-zinc-500 shrink-0" />
                  <p className="text-xs text-zinc-500">Push notifications are not supported in this browser.</p>
                </div>
              ) : pushEnabled ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20">
                      <Bell size={15} className="text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-500 text-zinc-200">Notifications active</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">You'll receive class reminders in your browser</p>
                    </div>
                  </div>
                  <button onClick={handleDisablePushNotifications} className="h-8 px-3.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-xs font-500 text-zinc-400 hover:text-zinc-200 transition-colors">Disable</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800/40 border border-zinc-700/40">
                      <BellOff size={15} className="text-zinc-500" />
                    </div>
                    <div>
                      <p className="text-sm font-500 text-zinc-200">Enable push notifications</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Get reminded before each class starts</p>
                    </div>
                  </div>
                  <button onClick={handleEnablePushNotifications} disabled={pushRequesting} className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-xs font-600 text-violet-300 hover:bg-violet-600/30 transition-colors disabled:opacity-60">
                    {pushRequesting && <Loader2 size={12} className="animate-spin" />}
                    Enable
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800/60">
              <h3 className="text-sm font-600 text-zinc-100">Notifications</h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">Control when and how you receive class reminders.</p>
            </div>
            <div className="divide-y divide-zinc-800/40">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-sm font-500 text-zinc-200">Class reminders</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Get notified before each class starts</p>
                </div>
                <Toggle checked={notifyBefore} onChange={setNotifyBefore} />
              </div>
              {notifyBefore && (
                <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-800/20">
                  <div>
                    <p className="text-xs font-500 text-zinc-400">Reminder time</p>
                    <p className="text-[10px] text-zinc-600">How many minutes before class</p>
                  </div>
                  <select value={notifyMinutes} onChange={(e) => setNotifyMinutes(e.target.value)} className="h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 text-zinc-200 text-xs px-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500/50 appearance-none">
                    {['5', '10', '15', '20', '30'].map((m) => (
                      <option key={m} value={m} className="bg-zinc-900">{m} minutes before</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-sm font-500 text-zinc-200">Weekly schedule summary</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Get a summary every Sunday evening</p>
                </div>
                <Toggle checked={notifyWeeklySummary} onChange={setNotifyWeeklySummary} />
              </div>
            </div>
          </div>

          {/* Display */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800/60">
              <h3 className="text-sm font-600 text-zinc-100">Display</h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">Customize how your timetable looks.</p>
            </div>
            <div className="divide-y divide-zinc-800/40">
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-500 text-zinc-200">Show free periods</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Display empty slots in the timetable grid</p>
                </div>
                <Toggle checked={showFreePeriods} onChange={setShowFreePeriods} />
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-500 text-zinc-200">Show teacher names</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Display faculty name on each timetable cell</p>
                </div>
                <Toggle checked={showTeacherNames} onChange={setShowTeacherNames} />
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-500 text-zinc-200">Show room numbers</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Display venue on each timetable cell</p>
                </div>
                <Toggle checked={showRoomNumbers} onChange={setShowRoomNumbers} />
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-500 text-zinc-200">Highlight today's column</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Apply a subtle tint to the current day</p>
                </div>
                <Toggle checked={highlightToday} onChange={setHighlightToday} />
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-500 text-zinc-200">Default timetable view</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">How the schedule opens by default</p>
                </div>
                <select value={defaultView} onChange={(e) => setDefaultView(e.target.value)} className="h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 text-zinc-200 text-xs px-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500/50 appearance-none">
                  <option value="weekly" className="bg-zinc-900">Weekly grid</option>
                  <option value="today" className="bg-zinc-900">Today only</option>
                  <option value="list" className="bg-zinc-900">List view</option>
                </select>
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 h-9 px-5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-600 text-white transition-all duration-150 active:scale-[0.97]">
              {saving ? <><Loader2 size={14} className="animate-spin" /><span>Saving…</span></> : saved ? <><Check size={14} /><span>Saved</span></> : 'Save Preferences'}
            </button>
            <button onClick={handleReset} className="h-9 px-4 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-sm font-500 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 transition-colors">
              Reset to Default
            </button>
          </div>
        </div>
      )}

      {activeSection === 'account' && (
        <div className="space-y-5 max-w-2xl">
          {/* Email info */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800/60">
              <h3 className="text-sm font-600 text-zinc-100">Account Info</h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">Your authentication details for ClassScheduler.</p>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center gap-3 rounded-lg bg-zinc-800/40 border border-zinc-800/60 px-4 py-3.5">
                <div className="h-8 w-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                  <Mail size={15} className="text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-500 text-zinc-200">Email</p>
                  <p className="font-mono text-[11px] text-zinc-500 truncate" suppressHydrationWarning>{user?.email || '—'}</p>
                </div>
                <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full border ${user?.email_confirmed_at ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                  {user?.email_confirmed_at ? 'Verified' : 'Unverified'}
                </span>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800/60">
              <h3 className="text-sm font-600 text-zinc-100">Change Password</h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">Update your account password.</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-600 text-zinc-400 uppercase tracking-wider">New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 characters" className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-600 text-zinc-400 uppercase tracking-wider">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" className={inputClass} />
              </div>
              {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
              <button onClick={handleChangePassword} disabled={changingPassword || !newPassword} className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-violet-600/20 border border-violet-500/30 text-xs font-600 text-violet-300 hover:bg-violet-600/30 disabled:opacity-50 transition-colors">
                {changingPassword ? <Loader2 size={12} className="animate-spin" /> : <Key size={12} />}
                Update Password
              </button>
            </div>
          </div>

          {/* Security */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800/60">
              <h3 className="text-sm font-600 text-zinc-100">Security</h3>
            </div>
            <div className="divide-y divide-zinc-800/40">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-start gap-3">
                  <Shield size={15} className="text-zinc-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-500 text-zinc-200">Email verification</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {user?.email_confirmed_at
                        ? `Verified on ${new Date(user.email_confirmed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        : 'Email not yet verified'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-500 text-zinc-200">Account created</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sign Out — above Danger Zone */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
            <div className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-500 text-zinc-200">Sign Out</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Sign out of your ClassScheduler account on this device</p>
                </div>
                <button
                  onClick={async () => { await signOut(); router.push('/sign-up-login-screen'); }}
                  className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-xs font-600 text-zinc-300 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-colors shrink-0 ml-4"
                >
                  <LogOut size={13} />
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Danger zone */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-red-500/15">
              <h3 className="text-sm font-600 text-red-400">Danger Zone</h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">These actions are irreversible. Proceed with caution.</p>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-500 text-zinc-200">Delete account</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Permanently remove your profile, subjects, timetable, and all associated data</p>
                </div>
                <button onClick={() => setShowDeleteModal(true)} className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-red-600/20 border border-red-500/30 text-xs font-600 text-red-400 hover:bg-red-600/30 transition-colors shrink-0 ml-4">
                  <Trash2 size={13} />
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'about' && (
        <div className="space-y-5 max-w-2xl">
          {/* App identity */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
            <div className="px-5 py-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                <Info size={22} className="text-violet-400" />
              </div>
              <div>
                <h3 className="text-base font-700 text-zinc-100">Class Scheduler</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">Version 1.0.0 · Built for students</p>
              </div>
            </div>
          </div>

          {/* Why ClassScheduler */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
            <button
              onClick={() => toggleAccordion('why')}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <div>
                <h3 className="text-sm font-600 text-zinc-100">Why Class Scheduler?</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">Our mission and purpose</p>
              </div>
              {openAccordion === 'why' ? <ChevronUp size={15} className="text-zinc-500 shrink-0" /> : <ChevronDown size={15} className="text-zinc-500 shrink-0" />}
            </button>
            {openAccordion === 'why' && (
              <div className="px-5 pb-5 border-t border-zinc-800/60 pt-4 space-y-3">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Class Scheduler was built to solve a simple but persistent problem every student faces — keeping track of a complex weekly timetable across multiple subjects, teachers, and venues.
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  We believe every student deserves a clean, distraction-free tool that helps them stay organised, never miss a class, and understand their weekly academic load at a glance. Class Scheduler is completely free and designed with students in mind — no clutter, no unnecessary features, just your schedule.
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Whether you're managing lab sessions, theory classes, or mixed-format subjects, Class Scheduler adapts to your curriculum and keeps everything in one place.
                </p>
              </div>
            )}
          </div>

          {/* Terms & Conditions */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
            <button
              onClick={() => toggleAccordion('terms')}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <div>
                <h3 className="text-sm font-600 text-zinc-100">Terms & Conditions</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">Usage terms and user agreement</p>
              </div>
              {openAccordion === 'terms' ? <ChevronUp size={15} className="text-zinc-500 shrink-0" /> : <ChevronDown size={15} className="text-zinc-500 shrink-0" />}
            </button>
            {openAccordion === 'terms' && (
              <div className="px-5 pb-5 border-t border-zinc-800/60 pt-4 space-y-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-600 text-zinc-300">1. Acceptance of Terms</h4>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">By using Class Scheduler, you agree to these terms. If you do not agree, please discontinue use of the application.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-600 text-zinc-300">2. User Data</h4>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">Your timetable data, subjects, and preferences are stored securely and are only accessible to you. We do not share your personal data with third parties.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-600 text-zinc-300">3. Account Responsibility</h4>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">You are responsible for maintaining the confidentiality of your account credentials. Class Scheduler is not liable for any unauthorised access resulting from your failure to secure your account.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-600 text-zinc-300">4. Acceptable Use</h4>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">Class Scheduler is intended for personal academic scheduling. You agree not to misuse the platform, attempt to reverse-engineer it, or use it for any unlawful purpose.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-600 text-zinc-300">5. Service Availability</h4>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">We strive to keep Class Scheduler available at all times but do not guarantee uninterrupted service. Scheduled maintenance or unforeseen outages may occur.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-600 text-zinc-300">6. Changes to Terms</h4>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">We reserve the right to update these terms at any time. Continued use of the application after changes constitutes acceptance of the revised terms.</p>
                </div>
              </div>
            )}
          </div>

          {/* Privacy Policy */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
            <button
              onClick={() => toggleAccordion('privacy')}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <div>
                <h3 className="text-sm font-600 text-zinc-100">Privacy Policy</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">How we handle your data</p>
              </div>
              {openAccordion === 'privacy' ? <ChevronUp size={15} className="text-zinc-500 shrink-0" /> : <ChevronDown size={15} className="text-zinc-500 shrink-0" />}
            </button>
            {openAccordion === 'privacy' && (
              <div className="px-5 pb-5 border-t border-zinc-800/60 pt-4 space-y-3">
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Class Scheduler collects only the information necessary to provide the service — your email address for authentication, and the timetable/subject data you enter. We do not sell, rent, or share your personal information with any third party.
                </p>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  All data is stored securely using industry-standard encryption. You may delete your account and all associated data at any time from the Account section of Settings.
                </p>
              </div>
            )}
          </div>

          {/* Helpdesk & Contact */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800/60">
              <h3 className="text-sm font-600 text-zinc-100">Helpdesk & Contact</h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">Get support or share feedback</p>
            </div>
            <div className="divide-y divide-zinc-800/40">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                    <Mail size={14} className="text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-500 text-zinc-200">Helpdesk Email</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">support@classscheduler.app</p>
                  </div>
                </div>
                <a
                  href="mailto:support@classscheduler.app"
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-xs font-500 text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
                >
                  <ExternalLink size={12} />
                  Email
                </a>
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                    <Mail size={14} className="text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-500 text-zinc-200">Report a Bug</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Found an issue? Let us know</p>
                  </div>
                </div>
                <a
                  href="mailto:bugs@classscheduler.app?subject=Bug Report"
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-xs font-500 text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
                >
                  <ExternalLink size={12} />
                  Report
                </a>
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <ExternalLink size={14} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-500 text-zinc-200">Feature Requests</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Suggest improvements or new features</p>
                  </div>
                </div>
                <a
                  href="mailto:feedback@classscheduler.app?subject=Feature Request"
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-xs font-500 text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
                >
                  <ExternalLink size={12} />
                  Suggest
                </a>
              </div>
            </div>
          </div>

          {/* App version footer */}
          <div className="text-center py-2">
            <p className="text-[10px] text-zinc-700">Class Scheduler · Made with ❤️ for students · v1.0.0</p>
          </div>
        </div>
      )}
    </>
  );
}