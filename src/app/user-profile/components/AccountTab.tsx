'use client';

import { useState } from 'react';
import { AlertTriangle, Shield, Trash2, X, Loader2, Mail, Key } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  loading: boolean;
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
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-lg bg-zinc-800 border border-zinc-700/50 text-xs font-500 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-60 text-xs font-600 text-white transition-colors"
          >
            {loading && <Loader2 size={12} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccountTab() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

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
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
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

  return (
    <>
      <Toaster position="bottom-right" theme="dark" richColors />
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
                <p className="font-mono text-[11px] text-zinc-500 truncate">{user?.email || '—'}</p>
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
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-600 text-zinc-400 uppercase tracking-wider">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className={inputClass}
              />
            </div>
            {passwordError && (
              <p className="text-xs text-red-400">{passwordError}</p>
            )}
            <button
              onClick={handleChangePassword}
              disabled={changingPassword || !newPassword}
              className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-violet-600/20 border border-violet-500/30 text-xs font-600 text-violet-300 hover:bg-violet-600/30 disabled:opacity-50 transition-colors"
            >
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
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-red-600/20 border border-red-500/30 text-xs font-600 text-red-400 hover:bg-red-600/30 transition-colors shrink-0 ml-4"
              >
                <Trash2 size={13} />
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete account modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title="Permanently delete your account?"
        description="This will immediately and irreversibly delete your ClassScheduler profile, all subjects, timetable entries, and preferences. Your college records are unaffected, but you will need to sign up again to use ClassScheduler."
        confirmLabel="Delete My Account"
        loading={deleteLoading}
      />
    </>
  );
}