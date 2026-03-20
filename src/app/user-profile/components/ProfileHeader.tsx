'use client';

import { useState, useEffect, useCallback } from 'react';
import { GraduationCap, Mail, Hash, Building2, BookOpen, Calendar, Edit2, X, Loader2, Check, AlertCircle } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

const DEPARTMENTS = [
  'Aeronautical Engineering',
  'Automobile Engineering',
  'Biomedical Engineering',
  'Biotechnology',
  'Chemical Engineering',
  'Civil Engineering',
  'Computer Science & Engineering',
  'Computer Science & Engineering (CyberSecurity)',
  'Computer Science & Business Systems',
  'Computer Science & Design',
  'Electrical & Electronics Engineering',
  'Electronics & Communication Engineering',
  'Food Technology',
  'Information Technology',
  'Artificial Intelligence & Machine Learning',
  'Artificial Intelligence & Data Science',
  'Mechanical Engineering',
  'Mechatronics Engineering',
  'Robotics and Automation',
];

const SEMESTERS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i);

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  onSaved: () => void;
}

function EditProfileModal({ isOpen, onClose, profile, onSaved }: EditProfileModalProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    full_name: '',
    student_id: '',
    department: '',
    semester: '',
    section: '',
    cgpa: '',
    degree_type: 'Undergraduate',
    year_of_joining: '',
  });

  useEffect(() => {
    if (isOpen && profile) {
      setForm({
        full_name: profile.full_name || '',
        student_id: profile.student_id || '',
        department: profile.department || '',
        semester: profile.semester || '',
        section: profile.section || '',
        cgpa: profile.cgpa || '',
        degree_type: profile.degree_type || 'Undergraduate',
        year_of_joining: profile.year_of_joining ? String(profile.year_of_joining) : '',
      });
      setErrorMsg('');
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: form.full_name,
          student_id: form.student_id,
          department: form.department,
          semester: form.semester,
          section: form.section,
          cgpa: form.cgpa,
          degree_type: form.degree_type,
          year_of_joining: form.year_of_joining ? parseInt(form.year_of_joining) : null,
        }, { onConflict: 'id' });
      if (error) throw error;
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onSaved();
        onClose();
      }, 800);
    } catch (err: any) {
      console.error('Profile save error:', err);
      setErrorMsg(err?.message || 'Failed to save profile. Please try again.');
    }
    setSaving(false);
  };

  const inputClass = "w-full h-9 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-100 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors placeholder:text-zinc-600";
  const selectClass = "w-full h-9 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-100 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 appearance-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl shadow-black/60 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-100">Edit Profile</h3>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-lg bg-red-500/10 border border-red-500/25 px-3 py-2.5">
              <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{errorMsg}</p>
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Full Name</label>
            <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Your full name" className={inputClass} />
          </div>

          {/* Student ID */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Student ID / Roll Number</label>
            <input value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} placeholder="e.g. 22CS001" className={inputClass} />
          </div>

          {/* Degree Type */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Degree Type</label>
            <div className="flex gap-2">
              {['Undergraduate', 'Postgraduate'].map((type) => (
                <button
                  key={type}
                  onClick={() => setForm({ ...form, degree_type: type })}
                  className={`flex-1 h-9 rounded-lg border text-sm font-medium transition-colors ${form.degree_type === type ? 'bg-violet-600/20 border-violet-500/40 text-violet-300' : 'bg-zinc-800/60 border-zinc-700/50 text-zinc-400 hover:text-zinc-200'}`}
                >
                  {type === 'Undergraduate' ? 'UG' : 'PG'} — {type}
                </button>
              ))}
            </div>
          </div>

          {/* Year of Joining */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Year of Joining</label>
            <select value={form.year_of_joining} onChange={(e) => setForm({ ...form, year_of_joining: e.target.value })} className={selectClass}>
              <option value="" className="bg-zinc-900">Select year…</option>
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={String(y)} className="bg-zinc-900">{y}</option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Department</label>
            <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={selectClass}>
              <option value="" className="bg-zinc-900">Select department…</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d} className="bg-zinc-900">{d}</option>
              ))}
            </select>
          </div>

          {/* Semester & Section */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Semester</label>
              <select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} className={selectClass}>
                <option value="" className="bg-zinc-900">Select sem…</option>
                {SEMESTERS.map((s) => (
                  <option key={s} value={s} className="bg-zinc-900">Sem {s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Section</label>
              <input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="e.g. A, B, CSE-A" className={inputClass} />
            </div>
          </div>

          {/* CGPA */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">CGPA (optional)</label>
            <input value={form.cgpa} onChange={(e) => setForm({ ...form, cgpa: e.target.value })} placeholder="e.g. 8.5" className={inputClass} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-zinc-800">
          <button onClick={onClose} className="h-8 px-4 rounded-lg bg-zinc-800 border border-zinc-700/50 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-xs font-semibold text-white transition-colors"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} /> : null}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfileHeader() {
  const { user, signOut } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [subjectCount, setSubjectCount] = useState(0);
  const [periodsPerWeek, setPeriodsPerWeek] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [profileRes, subjectsRes, entriesRes] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', user.id).single(),
        supabase.from('subjects').select('id').eq('user_id', user.id),
        supabase.from('timetable_entries').select('id').eq('user_id', user.id),
      ]);
      setProfile(profileRes.data);
      setSubjectCount((subjectsRes.data || []).length);
      setPeriodsPerWeek((entriesRes.data || []).length);
    } catch {}
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/sign-up-login-screen');
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'U';

  const STATS = [
    { label: 'Subjects', value: String(subjectCount), sub: 'this semester', color: 'text-violet-400' },
    { label: 'Periods/Week', value: String(periodsPerWeek), sub: 'assigned', color: 'text-sky-400' },
    { label: 'Free Periods', value: String(Math.max(0, 48 - periodsPerWeek)), sub: 'per week', color: 'text-emerald-400' },
    { label: 'CGPA', value: profile?.cgpa || '—', sub: 'cumulative', color: 'text-amber-400' },
  ];

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-violet-900/40 via-indigo-900/30 to-zinc-900/20" />
        <div className="px-6 pb-6 -mt-10 relative">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="h-20 w-20 rounded-2xl bg-zinc-800/60 animate-pulse ring-4 ring-zinc-900" />
            <div className="flex-1 space-y-2 pb-1">
              <div className="h-5 w-40 rounded bg-zinc-800/60 animate-pulse" />
              <div className="h-3 w-64 rounded bg-zinc-800/60 animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-zinc-800/40 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <EditProfileModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
        onSaved={fetchProfile}
      />
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-violet-900/40 via-indigo-900/30 to-zinc-900/20 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(263_70%_40%/0.2),transparent_70%)]" />
        </div>
        <div className="px-6 pb-6 -mt-10 relative">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 ring-4 ring-zinc-900 shadow-xl">
              <span className="text-2xl font-bold text-white">{initials}</span>
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-zinc-100">{profile?.full_name || user?.email?.split('@')[0] || 'Student'}</h1>
                {profile?.degree_type && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 border border-sky-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-sky-300">
                    {profile.degree_type === 'Undergraduate' ? 'UG' : 'PG'}
                  </span>
                )}
                {profile?.section && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 border border-violet-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-violet-300">
                    <GraduationCap size={11} />
                    {profile.section}
                  </span>
                )}
                <span className="inline-flex items-center rounded-full bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-green-400">
                  Active
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                {user?.email && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Mail size={12} />
                    <span className="font-mono">{user.email}</span>
                  </div>
                )}
                {profile?.student_id && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Hash size={12} />
                    <span className="font-mono">{profile.student_id}</span>
                  </div>
                )}
                {profile?.department && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Building2 size={12} />
                    <span>{profile.department}</span>
                  </div>
                )}
                {profile?.semester && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <BookOpen size={12} />
                    <span>Sem {profile.semester}</span>
                  </div>
                )}
                {profile?.year_of_joining && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Calendar size={12} />
                    <span>Joined {profile.year_of_joining}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:pb-1">
              <button
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-xs font-medium text-zinc-300 hover:bg-zinc-700/60 hover:text-zinc-100 transition-colors"
              >
                <Edit2 size={13} />
                Edit
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {STATS?.map((stat) => (
              <div key={stat?.label} className="rounded-lg bg-zinc-800/40 border border-zinc-800/60 px-4 py-3 text-center">
                <p className={`text-2xl font-bold tabular-nums ${stat?.color}`}>{stat?.value}</p>
                <p className="text-[11px] font-medium text-zinc-400 mt-0.5">{stat?.label}</p>
                <p className="text-[10px] text-zinc-600">{stat?.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}