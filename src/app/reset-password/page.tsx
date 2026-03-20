'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { AlertCircle, Loader2, Eye, EyeOff, CheckCircle2, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function ResetPasswordForm() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    let resolved = false;

    const finishCheck = (ready: boolean) => {
      if (!mounted || resolved) return;
      resolved = true;
      setSessionReady(ready);
      setChecking(false);
    };

    // When the user arrives here after /auth/callback exchanged the PKCE code,
    // Supabase already has a valid session. We just need to verify it exists.
    // Also listen for PASSWORD_RECOVERY event in case of direct hash-based links.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        finishCheck(true);
      } else if (event === 'SIGNED_IN' && session) {
        finishCheck(true);
      } else if (event === 'SIGNED_OUT') {
        finishCheck(false);
      }
    });

    // Check if a session already exists (user arrived from /auth/callback which
    // already exchanged the PKCE code and set the session cookie)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        // Session exists — user can reset their password
        finishCheck(true);
        return;
      }
      // No session yet — wait for auth state change event (hash-based flow)
      // Give it 4 seconds before declaring the link invalid
      setTimeout(() => finishCheck(false), 4000);
    }).catch(() => {
      if (mounted) setTimeout(() => finishCheck(false), 4000);
    });

    // Hard fallback: stop spinner after 5 seconds regardless
    const timeout = setTimeout(() => {
      if (mounted && !resolved) {
        setChecking(false);
      }
    }, 5000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter a new password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || 'Failed to update password. Please try again.');
      } else {
        setSuccess(true);
        // Sign out after password reset so user logs in fresh with new password
        await supabase.auth.signOut({ scope: 'local' });
        setTimeout(() => router.push('/sign-up-login-screen'), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full h-10 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-100 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors placeholder:text-zinc-600";

  // Show spinner while verifying the reset link
  if (checking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={28} className="animate-spin text-violet-400" />
          <p className="text-sm text-zinc-500">Verifying reset link…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] animate-fade-in">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <AppLogo size={32} />
          <span className="font-display font-700 text-lg text-zinc-100">ClassScheduler</span>
        </div>

        {success ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center gap-4 pt-4">
              <div className="h-20 w-20 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                <CheckCircle2 size={36} className="text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-700 text-zinc-100 tracking-tight">Password updated!</h2>
                <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
                  Your password has been successfully reset. Redirecting you to sign in…
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-green-500/10 border border-green-500/25 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-green-400 shrink-0" />
                <span className="text-[11px] text-green-300">You can now sign in with your new password</span>
              </div>
            </div>
            <button
              onClick={() => router.push('/sign-up-login-screen')}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] transition-all duration-150 font-600 text-sm text-white shadow-sm"
            >
              Go to Sign In
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center gap-4 pt-4">
              <div className="h-16 w-16 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                <Lock size={28} className="text-violet-400" />
              </div>
              <div>
                <h2 className="text-2xl font-700 text-zinc-100 tracking-tight">Set new password</h2>
                <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
                  Choose a strong password for your account.
                </p>
              </div>
            </div>

            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-600 text-zinc-400">New Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className={`${inputClass} pr-10`}
                    autoComplete="new-password"
                    autoFocus
                    disabled={!sessionReady}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-600 text-zinc-400">Confirm New Password *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className={inputClass}
                  autoComplete="new-password"
                  disabled={!sessionReady}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-lg bg-red-500/10 border border-red-500/25 px-3.5 py-3">
                  <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300 leading-relaxed">{error}</p>
                </div>
              )}

              {!sessionReady && (
                <div className="flex items-start gap-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 px-3.5 py-3">
                  <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300 leading-relaxed">
                    Invalid or expired reset link. Please{' '}
                    <button
                      type="button"
                      onClick={() => router.push('/sign-up-login-screen')}
                      className="underline hover:text-amber-200 transition-colors"
                    >
                      request a new one
                    </button>
                    .
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !sessionReady}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed font-600 text-sm text-white shadow-sm"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  'Update Password'
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => router.push('/sign-up-login-screen')}
              className="w-full text-center text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-violet-400" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
