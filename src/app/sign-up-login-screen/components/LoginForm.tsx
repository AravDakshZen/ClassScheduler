'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { AlertCircle, Loader2, Info, Eye, EyeOff, Mail, CheckCircle2, Plus, X, BookOpen, ArrowLeft } from 'lucide-react';
import { createClient } from '../../../lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type AuthMode = 'signin' | 'signup';
type Step = 'auth' | 'verify-email' | 'section-select' | 'forgot-password' | 'email-confirmed';

const DEPARTMENTS = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Information Technology'];
const SEMESTERS = ['Semester I', 'Semester II', 'Semester III', 'Semester IV', 'Semester V', 'Semester VI', 'Semester VII', 'Semester VIII'];

const COLOR_CYCLE = [0, 1, 2, 3, 4, 5, 6, 7];

const isRateLimitError = (err: any): boolean => {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = String(err.code || err.error_code || err.status || '').toLowerCase();
  return (
    msg.includes('request rate limit') ||
    msg.includes('over_request_rate_limit') ||
    msg.includes('email rate limit exceeded') ||
    code === '429' ||
    code === 'over_request_rate_limit' ||
    err.status === 429
  );
};

const isLockError = (err: any): boolean => {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return (
    (err as any).isLockError === true ||
    msg.includes('lock') ||
    msg.includes('aborterror') ||
    err.name === 'AbortError' ||
    (err instanceof DOMException && err.name === 'AbortError')
  );
};

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const supabase = createClient();

  const [step, setStep] = useState<Step>('auth');
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Section select
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedSem, setSelectedSem] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [sectionError, setSectionError] = useState('');

  // Enrolled subjects list
  const [subjectInput, setSubjectInput] = useState('');
  const [enrolledSubjects, setEnrolledSubjects] = useState<string[]>([]);
  const subjectInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Show email-confirmed success state when redirected from callback
    const confirmed = searchParams.get('confirmed');
    if (confirmed === '1') {
      setStep('email-confirmed');
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      // Only proceed if email is confirmed
      if (!user.email_confirmed_at) {
        setPendingEmail(user.email || '');
        setStep('verify-email');
        return;
      }
      checkProfileSetup();
    }
  }, [user, authLoading]);

  const checkProfileSetup = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('department, semester, section')
        .eq('id', user.id)
        .single();
      if (data?.department && data?.semester && data?.section) {
        router.push('/timetable-view');
      } else {
        setStep('section-select');
      }
    } catch {
      setStep('section-select');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError('Please enter your email and password.');
      return;
    }
    setIsLoading(true);
    setAuthError('');
    try {
      const data = await signIn(email, password);
      // Check if email is confirmed after sign-in
      const signedInUser = data?.user;
      if (signedInUser && !signedInUser.email_confirmed_at) {
        setPendingEmail(email);
        setStep('verify-email');
        return;
      }
      // Auth state change will trigger checkProfileSetup via useEffect
    } catch (err: any) {
      const msg = (err.message || '').toLowerCase();
      if (isRateLimitError(err)) {
        setAuthError('Too many sign-in attempts. Please wait a minute and try again.');
      } else if (msg.includes('email not confirmed')) {
        setPendingEmail(email);
        setStep('verify-email');
      } else if (msg.includes('invalid login credentials') || msg.includes('invalid email or password')) {
        setAuthError('Incorrect email or password. Please try again.');
      } else if (msg.includes('email not found') || msg.includes('user not found')) {
        setAuthError('No account found with this email. Please sign up.');
      } else {
        setAuthError(err.message || 'Sign in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      setAuthError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    setAuthError('');
    try {
      await signUp(email, password, { fullName });
      setPendingEmail(email);
      setStep('verify-email');
    } catch (err: any) {
      const msg = err.message || '';
      if (isRateLimitError(err)) {
        setAuthError('Too many sign-up attempts. Please wait a minute and try again.');
      } else if (isLockError(err)) {
        setAuthError('Sign up is taking longer than expected. Please try again.');
      } else if (msg.includes('already registered') || msg.includes('already been registered')) {
        setAuthError('An account with this email already exists. Please sign in.');
      } else {
        setAuthError(msg || 'Sign up failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!pendingEmail || resendCooldown > 0) return;
    setIsLoading(true);
    try {
      // Try Supabase native resend first
      const { error } = await supabase.auth.resend({ type: 'signup', email: pendingEmail });
      if (error) {
        if (isRateLimitError(error)) {
          setAuthError('Too many requests. Please wait a minute before trying again.');
          setIsLoading(false);
          return;
        }
      }

      // Also trigger Resend edge function for reliable delivery
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        await fetch(`${supabaseUrl}/functions/v1/send-verification-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: pendingEmail,
            confirmationUrl: `${window.location.origin}/auth/callback`,
            fullName: ''
          })
        });
      } catch {
        // Non-fatal
      }

      // Start 60-second cooldown
      setResendCooldown(60);
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      cooldownRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {}
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotError('Please enter your email address.');
      return;
    }
    setIsLoading(true);
    setForgotError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        // Must go through /auth/callback so Supabase can exchange the PKCE code,
        // then the callback route redirects to /reset-password
        redirectTo: `${window.location.origin}/auth/callback?type=recovery&next=/reset-password`,
      });
      if (error) {
        if (isRateLimitError(error)) {
          setForgotError('Too many requests. Please wait a minute and try again.');
        } else {
          setForgotError(error.message || 'Failed to send reset email. Please try again.');
        }
      } else {
        setForgotSuccess(true);
      }
    } catch (err: any) {
      setForgotError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    setStep('auth');
    setAuthMode('signin');
    setAuthError('');
    setForgotEmail('');
    setForgotError('');
    setForgotSuccess(false);
  };

  // Enrolled subjects helpers
  const handleAddSubject = () => {
    const name = subjectInput.trim();
    if (!name) return;
    if (enrolledSubjects.includes(name)) {
      setSubjectInput('');
      return;
    }
    setEnrolledSubjects((prev) => [...prev, name]);
    setSubjectInput('');
    subjectInputRef.current?.focus();
  };

  const handleSubjectKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubject();
    }
  };

  const handleRemoveSubject = (name: string) => {
    setEnrolledSubjects((prev) => prev.filter((s) => s !== name));
  };

  const handleSectionSubmit = async () => {
    if (!selectedDept || !selectedSem || !selectedSection) {
      setSectionError('Please select your department, semester, and section to continue.');
      return;
    }
    setSectionError('');
    setIsLoading(true);
    try {
      if (user) {
        await supabase
          .from('user_profiles')
          .update({
            department: selectedDept,
            semester: selectedSem,
            section: selectedSection,
          })
          .eq('id', user.id);

        // Save enrolled subjects if any
        if (enrolledSubjects.length > 0) {
          const subjectPayloads = enrolledSubjects.map((name, idx) => ({
            user_id: user.id,
            code: name.split(' ').map((w) => w[0]?.toUpperCase() || '').join('').slice(0, 6) || 'SUB',
            name,
            teacher: '',
            teacher_designation: '',
            credits: 3,
            subject_type: 'Theory',
            periods_per_week: 3,
            room: '',
            color_index: idx % 8,
          }));
          await supabase.from('subjects').insert(subjectPayloads);
        }
      }
      router.push('/timetable-view');
    } catch (err: any) {
      setSectionError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full h-10 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-100 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors placeholder:text-zinc-600";

  return (
    <div className="relative w-full max-w-[400px] animate-fade-in">
      {/* Logo — shown on mobile only */}
      <div className="lg:hidden flex items-center gap-2.5 mb-8">
        <AppLogo size={32} />
        <span className="font-display font-700 text-lg text-zinc-100">ClassScheduler</span>
      </div>

      {/* ── STEP: AUTH (Sign In / Sign Up) ── */}
      {step === 'auth' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-700 text-zinc-100 tracking-tight">
              {authMode === 'signin' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="mt-1.5 text-sm text-zinc-500">
              {authMode === 'signin' ? 'Sign in to access your class timetable.' : 'Sign up to start building your timetable.'}
            </p>
          </div>

          <form onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp} className="space-y-3.5">
            {authMode === 'signup' && (
              <div className="space-y-1">
                <label className="block text-xs font-600 text-zinc-400">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Arjun Mehta"
                  className={inputClass}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-600 text-zinc-400">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                className={inputClass}
                autoComplete="email"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-600 text-zinc-400">Password *</label>
                {authMode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => { setStep('forgot-password'); setForgotEmail(email); setAuthError(''); }}
                    className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={authMode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                  className={`${inputClass} pr-10`}
                  autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
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

            {authMode === 'signup' && (
              <div className="space-y-1">
                <label className="block text-xs font-600 text-zinc-400">Confirm Password *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className={inputClass}
                  autoComplete="new-password"
                />
              </div>
            )}

            {authError && (
              <div className="flex items-start gap-2.5 rounded-lg bg-red-500/10 border border-red-500/25 px-3.5 py-3">
                <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300 leading-relaxed">{authError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed font-600 text-sm text-white shadow-sm mt-1"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                authMode === 'signin' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-zinc-950 px-3 text-[11px] text-zinc-600">
                {authMode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
              </span>
            </div>
          </div>

          <button
            onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError(''); }}
            className="w-full h-10 rounded-xl bg-zinc-800/60 border border-zinc-700/50 text-sm font-500 text-zinc-300 hover:bg-zinc-700/60 hover:text-zinc-100 transition-colors"
          >
            {authMode === 'signin' ? 'Create a new account' : 'Sign in instead'}
          </button>

          {authMode === 'signup' && (
            <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/60 px-4 py-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <Info size={13} className="text-violet-400 shrink-0" />
                <span className="text-[11px] font-600 text-zinc-400">Email verification required</span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                After signing up, check your inbox for a verification email. Click the link to activate your account.
              </p>
            </div>
          )}

          <p className="text-[11px] text-center text-zinc-700 leading-relaxed">
            By continuing, you agree to our{' '}
            <a href="#" className="text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors">Privacy Policy</a>.
          </p>
        </div>
      )}

      {/* ── STEP: FORGOT PASSWORD ── */}
      {step === 'forgot-password' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col items-center text-center gap-4 pt-4">
            <div className="h-16 w-16 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
              <Mail size={28} className="text-violet-400" />
            </div>
            <div>
              <h2 className="text-2xl font-700 text-zinc-100 tracking-tight">Reset password</h2>
              <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
                Enter your account email and we'll send you a link to reset your password.
              </p>
            </div>
          </div>

          {!forgotSuccess ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-600 text-zinc-400">Email address</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@college.edu"
                  className={inputClass}
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {forgotError && (
                <div className="flex items-start gap-2.5 rounded-lg bg-red-500/10 border border-red-500/25 px-3.5 py-3">
                  <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300 leading-relaxed">{forgotError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed font-600 text-sm text-white shadow-sm"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-green-500/10 border border-green-500/25 px-4 py-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-green-400 shrink-0" />
                  <span className="text-sm font-600 text-green-300">Reset link sent!</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  We sent a password reset link to{' '}
                  <span className="text-zinc-200 font-500">{forgotEmail}</span>.
                  Check your inbox and follow the instructions.
                </p>
              </div>
              <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/60 px-4 py-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-zinc-500 shrink-0" />
                  <span className="text-[11px] text-zinc-500">Check your spam/junk folder if not found</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-zinc-500 shrink-0" />
                  <span className="text-[11px] text-zinc-500">The link expires in 1 hour</span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleBackToSignIn}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <ArrowLeft size={13} />
            Back to sign in
          </button>
        </div>
      )}

      {/* ── STEP: EMAIL CONFIRMED ── */}
      {step === 'email-confirmed' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col items-center text-center gap-4 pt-4">
            <div className="relative h-20 w-20">
              <div className="h-20 w-20 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                <CheckCircle2 size={36} className="text-green-400" />
              </div>
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-violet-600 border-2 border-zinc-950 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 text-white"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-700 text-zinc-100 tracking-tight">Email confirmed!</h2>
              <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
                Your email address has been successfully verified. Your account is now active and ready to use.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/60 px-4 py-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={11} className="text-green-400 shrink-0" />
              <span className="text-[11px] text-zinc-400">Email address verified</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={11} className="text-green-400 shrink-0" />
              <span className="text-[11px] text-zinc-400">Account activated successfully</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={11} className="text-green-400 shrink-0" />
              <span className="text-[11px] text-zinc-400">You can now sign in to your account</span>
            </div>
          </div>

          <button
            onClick={handleBackToSignIn}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] transition-all duration-150 font-600 text-sm text-white shadow-sm"
          >
            Continue to Sign In
          </button>
        </div>
      )}

      {/* ── STEP: VERIFY EMAIL ── */}
      {step === 'verify-email' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col items-center text-center gap-4 pt-4">
            <div className="h-16 w-16 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
              <Mail size={28} className="text-violet-400" />
            </div>
            <div>
              <h2 className="text-2xl font-700 text-zinc-100 tracking-tight">Check your email</h2>
              <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
                We sent a verification link to{' '}
                <span className="text-zinc-300 font-500">{pendingEmail}</span>.
                Click the link to verify and activate your account.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/60 px-4 py-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={11} className="text-green-400 shrink-0" />
              <span className="text-[11px] text-zinc-400">Open your email inbox</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={11} className="text-green-400 shrink-0" />
              <span className="text-[11px] text-zinc-400">Click the verification link from ClassScheduler</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={11} className="text-green-400 shrink-0" />
              <span className="text-[11px] text-zinc-400">Return here and sign in with your credentials</span>
            </div>
          </div>

          <button
            onClick={handleResendVerification}
            disabled={isLoading || resendCooldown > 0}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-zinc-800/60 border border-zinc-700/50 text-sm font-500 text-zinc-300 hover:bg-zinc-700/60 hover:text-zinc-100 transition-colors disabled:opacity-60"
          >
            {isLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : resendCooldown > 0 ? (
              `Resend available in ${resendCooldown}s`
            ) : (
              'Resend verification email'
            )}
          </button>

          <button
            onClick={() => { setStep('auth'); setAuthMode('signin'); setAuthError(''); }}
            className="w-full text-center text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            ← Back to sign in
          </button>
        </div>
      )}

      {/* ── STEP: SECTION SELECT ── */}
      {step === 'section-select' && (
        <div className="space-y-5 animate-fade-in">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-6 w-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-green-400"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <span className="text-xs text-green-400 font-500">Signed in as {user?.email}</span>
            </div>
            <h2 className="text-2xl font-700 text-zinc-100 tracking-tight">Set up your profile</h2>
            <p className="mt-1.5 text-sm text-zinc-500">
              Select your department, semester, and section to load your timetable.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-600 text-zinc-300">Department</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full h-10 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-100 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors appearance-none"
            >
              <option value="" className="bg-zinc-900">Select department…</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d} className="bg-zinc-900">{d}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-600 text-zinc-300">Semester</label>
            <select
              value={selectedSem}
              onChange={(e) => setSelectedSem(e.target.value)}
              className="w-full h-10 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-100 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors appearance-none"
            >
              <option value="" className="bg-zinc-900">Select semester…</option>
              {SEMESTERS.map((s) => (
                <option key={s} value={s} className="bg-zinc-900">{s}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-600 text-zinc-300">Section</label>
            <input
              type="text"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              placeholder="e.g. A, B, C or any section name"
              className="w-full h-10 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-100 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors placeholder:text-zinc-600"
            />
          </div>

          {/* Enrolled Subjects */}
          <div className="space-y-2">
            <label className="block text-xs font-600 text-zinc-300">
              Enrolled Subjects <span className="text-zinc-600 font-400">(optional)</span>
            </label>
            <p className="text-[11px] text-zinc-500">Enter your subjects one by one. Press Enter or click Add after each.</p>
            <div className="flex gap-2">
              <input
                ref={subjectInputRef}
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                onKeyDown={handleSubjectKeyDown}
                placeholder="e.g. Data Structures"
                className="flex-1 h-9 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-100 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors placeholder:text-zinc-600"
              />
              <button
                type="button"
                onClick={handleAddSubject}
                disabled={!subjectInput.trim()}
                className="flex items-center gap-1 h-9 px-3 rounded-lg bg-violet-600/20 border border-violet-500/30 text-xs font-600 text-violet-300 hover:bg-violet-600/30 disabled:opacity-40 transition-colors shrink-0"
              >
                <Plus size={13} />
                Add
              </button>
            </div>

            {/* Subject list */}
            {enrolledSubjects.length > 0 && (
              <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <BookOpen size={11} className="text-zinc-600" />
                  <span className="text-[10px] font-600 uppercase tracking-widest text-zinc-600">{enrolledSubjects.length} subject{enrolledSubjects.length !== 1 ? 's' : ''} added</span>
                </div>
                {enrolledSubjects.map((name) => (
                  <div key={name} className="flex items-center justify-between gap-2 rounded-md bg-zinc-800/40 px-3 py-1.5">
                    <span className="text-xs text-zinc-300 truncate">{name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubject(name)}
                      className="text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {sectionError && (
            <div className="flex items-start gap-2.5 rounded-lg bg-red-500/10 border border-red-500/25 px-3.5 py-3">
              <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{sectionError}</p>
            </div>
          )}

          <button
            onClick={handleSectionSubmit}
            disabled={isLoading || !selectedDept || !selectedSem || !selectedSection}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed font-600 text-sm text-white"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              'Continue to Timetable →'
            )}
          </button>
        </div>
      )}
    </div>
  );
}