'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, User, Clock, ChevronDown, ChevronUp, Plus, Trash2, Edit2, X, Loader2, BookOpen, Tag, Search, SlidersHorizontal, Filter } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Toaster } from 'sonner';

interface Subject {
  id: string;
  code: string;
  name: string;
  teacher: string;
  teacherDesignation: string;
  credits: number;
  subjectType: string;
  periodsPerWeek: number;
  room: string;
  colorIndex: number;
  department?: string;
  semester?: string;
}

const COLOR_OPTIONS = [
  { bg: 'bg-violet-500/10', text: 'text-violet-300', border: 'border-violet-500/25', dot: 'bg-violet-500' },
  { bg: 'bg-indigo-500/10', text: 'text-indigo-300', border: 'border-indigo-500/25', dot: 'bg-indigo-500' },
  { bg: 'bg-sky-500/10', text: 'text-sky-300', border: 'border-sky-500/25', dot: 'bg-sky-500' },
  { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/25', dot: 'bg-emerald-500' },
  { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/25', dot: 'bg-amber-500' },
  { bg: 'bg-rose-500/10', text: 'text-rose-300', border: 'border-rose-500/25', dot: 'bg-rose-500' },
  { bg: 'bg-teal-500/10', text: 'text-teal-300', border: 'border-teal-500/25', dot: 'bg-teal-500' },
  { bg: 'bg-orange-500/10', text: 'text-orange-300', border: 'border-orange-500/25', dot: 'bg-orange-500' },
];

const SUBJECT_TYPES = ['Theory', 'Lab', 'Theory + Lab'];

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics',
  'Mechanical',
  'Civil',
  'Electrical',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Other',
];

const SEMESTERS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

const CREDIT_RANGES = [
  { label: 'Any', value: '' },
  { label: '0 cr', value: '0' },
  { label: '1–2 cr', value: '1-2' },
  { label: '3 cr', value: '3' },
  { label: '4 cr', value: '4' },
  { label: '5+ cr', value: '5+' },
];

const EMPTY_FORM = {
  code: '',
  name: '',
  teacher: '',
  teacherDesignation: '',
  credits: 3,
  subjectType: 'Theory',
  periodsPerWeek: 3,
  room: '',
  colorIndex: 0,
  department: '',
  semester: '',
};

function SubjectModal({
  isOpen,
  onClose,
  onSave,
  editSubject,
  saving,
  prefillName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: typeof EMPTY_FORM) => void;
  editSubject: Subject | null;
  saving: boolean;
  prefillName?: string;
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (editSubject) {
      setForm({
        code: editSubject.code,
        name: editSubject.name,
        teacher: editSubject.teacher,
        teacherDesignation: editSubject.teacherDesignation,
        credits: editSubject.credits,
        subjectType: editSubject.subjectType,
        periodsPerWeek: editSubject.periodsPerWeek,
        room: editSubject.room,
        colorIndex: editSubject.colorIndex,
        department: editSubject.department || '',
        semester: editSubject.semester || '',
      });
    } else {
      setForm({ ...EMPTY_FORM, name: prefillName || '' });
    }
  }, [editSubject, isOpen, prefillName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl shadow-black/60 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h3 className="text-sm font-600 text-zinc-100">{editSubject ? 'Edit Subject' : 'Add Subject Details'}</h3>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-600 text-zinc-400 uppercase tracking-wider">Subject Code *</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. CS601"
                className="w-full h-9 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-100 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-600 text-zinc-400 uppercase tracking-wider">Credits</label>
              <input
                type="number"
                min={0}
                max={6}
                value={form.credits}
                onChange={(e) => setForm({ ...form, credits: parseInt(e.target.value) || 0 })}
                className="w-full h-9 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-100 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-600 text-zinc-400 uppercase tracking-wider">Subject Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Data Structures & Algorithms"
              className="w-full h-9 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-100 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-600 text-zinc-400 uppercase tracking-wider">Department</label>
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full h-9 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-100 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 appearance-none"
              >
                <option value="" className="bg-zinc-900">Select dept…</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d} className="bg-zinc-900">{d}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-600 text-zinc-400 uppercase tracking-wider">Semester</label>
              <select
                value={form.semester}
                onChange={(e) => setForm({ ...form, semester: e.target.value })}
                className="w-full h-9 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-100 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 appearance-none"
              >
                <option value="" className="bg-zinc-900">Select sem…</option>
                {SEMESTERS.map((s) => (
                  <option key={s} value={s} className="bg-zinc-900">Sem {s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-600 text-zinc-400 uppercase tracking-wider">Teacher Name</label>
              <input
                value={form.teacher}
                onChange={(e) => setForm({ ...form, teacher: e.target.value })}
                placeholder="e.g. Dr. R. Sharma"
                className="w-full h-9 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-100 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-600 text-zinc-400 uppercase tracking-wider">Designation</label>
              <input
                value={form.teacherDesignation}
                onChange={(e) => setForm({ ...form, teacherDesignation: e.target.value })}
                placeholder="e.g. Associate Professor"
                className="w-full h-9 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-100 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-600 text-zinc-400 uppercase tracking-wider">Type</label>
              <select
                value={form.subjectType}
                onChange={(e) => setForm({ ...form, subjectType: e.target.value })}
                className="w-full h-9 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-100 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 appearance-none"
              >
                {SUBJECT_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-zinc-900">{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-600 text-zinc-400 uppercase tracking-wider">Periods/Week</label>
              <input
                type="number"
                min={1}
                max={14}
                value={form.periodsPerWeek}
                onChange={(e) => setForm({ ...form, periodsPerWeek: parseInt(e.target.value) || 1 })}
                className="w-full h-9 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-100 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-600 text-zinc-400 uppercase tracking-wider">Room / Venue</label>
            <input
              value={form.room}
              onChange={(e) => setForm({ ...form, room: e.target.value })}
              placeholder="e.g. LH-3 / Lab-301"
              className="w-full h-9 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-100 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-600 text-zinc-400 uppercase tracking-wider">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c, idx) => (
                <button
                  key={idx}
                  onClick={() => setForm({ ...form, colorIndex: idx })}
                  className={`h-7 w-7 rounded-full ${c.dot} transition-all ${form.colorIndex === idx ? 'ring-2 ring-white/40 ring-offset-2 ring-offset-zinc-900 scale-110' : 'opacity-60 hover:opacity-100'}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-lg bg-zinc-800 border border-zinc-700/50 text-xs font-500 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.code || !form.name}
            className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-xs font-600 text-white transition-colors"
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            {editSubject ? 'Save Changes' : 'Add Subject'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SubjectsTab() {
  const { user } = useAuth();
  const supabase = createClient();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Quick-add list input state
  const [quickInput, setQuickInput] = useState('');
  const [quickAdding, setQuickAdding] = useState(false);
  const [prefillName, setPrefillName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterCredits, setFilterCredits] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (user) fetchSubjects();
  }, [user]);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (!error && data) {
        setSubjects(data.map((s: any) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          teacher: s.teacher || '',
          teacherDesignation: s.teacher_designation || '',
          credits: s.credits || 0,
          subjectType: s.subject_type || 'Theory',
          periodsPerWeek: s.periods_per_week || 0,
          room: s.room || '',
          colorIndex: s.color_index || 0,
          department: s.department || '',
          semester: s.semester || '',
        })));
      }
    } catch {}
    setLoading(false);
  };

  // Filtered subjects
  const filteredSubjects = useMemo(() => {
    return subjects.filter((sub) => {
      // Search: name or code
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!sub.name.toLowerCase().includes(q) && !sub.code.toLowerCase().includes(q)) return false;
      }
      // Department filter
      if (filterDept && sub.department !== filterDept) return false;
      // Semester filter
      if (filterSemester && sub.semester !== filterSemester) return false;
      // Credits filter
      if (filterCredits) {
        const cr = sub.credits;
        if (filterCredits === '0' && cr !== 0) return false;
        if (filterCredits === '1-2' && (cr < 1 || cr > 2)) return false;
        if (filterCredits === '3' && cr !== 3) return false;
        if (filterCredits === '4' && cr !== 4) return false;
        if (filterCredits === '5+' && cr < 5) return false;
      }
      return true;
    });
  }, [subjects, searchQuery, filterDept, filterCredits, filterSemester]);

  const hasActiveFilters = searchQuery.trim() || filterDept || filterCredits || filterSemester;

  const clearFilters = () => {
    setSearchQuery('');
    setFilterDept('');
    setFilterCredits('');
    setFilterSemester('');
  };

  // Quick-add: just enter a subject name and it gets added with defaults
  const handleQuickAdd = async () => {
    const name = quickInput.trim();
    if (!name) return;
    setQuickAdding(true);
    try {
      const words = name.split(' ').filter(Boolean);
      const autoCode = words.map((w) => w[0].toUpperCase()).join('').slice(0, 6) || 'SUB';
      const colorIndex = subjects.length % COLOR_OPTIONS.length;
      const payload = {
        user_id: user.id,
        code: autoCode,
        name,
        teacher: '',
        teacher_designation: '',
        credits: 3,
        subject_type: 'Theory',
        periods_per_week: 3,
        room: '',
        color_index: colorIndex,
        department: '',
        semester: '',
      };
      await supabase.from('subjects').insert(payload);
      await fetchSubjects();
      setQuickInput('');
      toast.success(`"${name}" added to your subjects`);
      inputRef.current?.focus();
    } catch {
      toast.error('Failed to add subject. Please try again.');
    }
    setQuickAdding(false);
  };

  const handleQuickInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickAdd();
    }
  };

  const handleSave = async (form: typeof EMPTY_FORM) => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        code: form.code,
        name: form.name,
        teacher: form.teacher,
        teacher_designation: form.teacherDesignation,
        credits: form.credits,
        subject_type: form.subjectType,
        periods_per_week: form.periodsPerWeek,
        room: form.room,
        color_index: form.colorIndex,
        department: form.department,
        semester: form.semester,
      };
      if (editSubject) {
        await supabase.from('subjects').update(payload).eq('id', editSubject.id);
        toast.success(`"${form.name}" updated successfully`);
      } else {
        await supabase.from('subjects').insert(payload);
        toast.success(`"${form.name}" added to your subjects`);
      }
      await fetchSubjects();
      setModalOpen(false);
      setEditSubject(null);
      setPrefillName('');
    } catch {
      toast.error('Failed to save subject. Please try again.');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const subjectToDelete = subjects.find((s) => s.id === id);
    setDeletingId(id);
    try {
      await supabase.from('timetable_entries').update({ subject_id: null }).eq('subject_id', id);
      await supabase.from('subjects').delete().eq('id', id);
      await fetchSubjects();
      toast.success(`"${subjectToDelete?.name || 'Subject'}" deleted`);
    } catch {
      toast.error('Failed to delete subject. Please try again.');
    }
    setDeletingId(null);
  };

  const totalCredits = subjects.reduce((a, s) => a + s.credits, 0);
  const totalPeriods = subjects.reduce((a, s) => a + s.periodsPerWeek, 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 rounded-xl bg-zinc-800/40 animate-pulse" />
        <div className="rounded-xl border border-zinc-800/60 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-zinc-800/40">
              <div className="h-5 w-16 rounded bg-zinc-800/60 animate-pulse" />
              <div className="h-5 w-48 rounded bg-zinc-800/60 animate-pulse" />
              <div className="h-5 w-32 rounded bg-zinc-800/60 animate-pulse ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="bottom-right" theme="dark" richColors />
      <SubjectModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditSubject(null); setPrefillName(''); }}
        onSave={handleSave}
        editSubject={editSubject}
        saving={saving}
        prefillName={prefillName}
      />

      <div className="space-y-4">
        {/* Quick-add input */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-zinc-800/60">
            <h3 className="text-sm font-600 text-zinc-100">Add Subjects</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">Type a subject name and press Enter or click Add to build your list.</p>
          </div>
          <div className="px-4 sm:px-5 py-4">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                onKeyDown={handleQuickInputKeyDown}
                placeholder="e.g. Data Structures, Operating Systems…"
                className="flex-1 h-10 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-100 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors placeholder:text-zinc-600"
              />
              <button
                onClick={handleQuickAdd}
                disabled={quickAdding || !quickInput.trim()}
                className="flex items-center gap-1.5 h-10 px-3 sm:px-4 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-sm font-600 text-white transition-colors shrink-0"
              >
                {quickAdding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                <span className="hidden sm:inline">Add</span>
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 mt-2">After adding, click the edit icon on any subject to fill in full details (code, teacher, credits, etc.)</p>
          </div>
        </div>

        {/* Summary bar */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 px-4 py-3 rounded-xl bg-zinc-800/30 border border-zinc-800/60">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Credits</span>
            <span className="font-mono text-sm font-700 text-violet-300 tabular-nums">{totalCredits}</span>
          </div>
          <div className="h-4 w-px bg-zinc-700" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Periods/Wk</span>
            <span className="font-mono text-sm font-700 text-sky-300 tabular-nums">{totalPeriods}</span>
          </div>
          <div className="h-4 w-px bg-zinc-700" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Subjects</span>
            <span className="font-mono text-sm font-700 text-zinc-300 tabular-nums">{subjects.length}</span>
          </div>
          <div className="ml-auto">
            <button
              onClick={() => { setEditSubject(null); setPrefillName(''); setModalOpen(true); }}
              className="flex items-center gap-1.5 h-8 px-3 sm:px-3.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-xs font-600 text-violet-300 hover:bg-violet-600/30 transition-colors"
            >
              <Plus size={13} />
              <span className="hidden sm:inline">Add with Details</span>
              <span className="sm:hidden">Details</span>
            </button>
          </div>
        </div>

        {/* Search & Filter bar */}
        {subjects.length > 0 && (
          <div className="space-y-2">
            {/* Search row */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or code…"
                  className="w-full h-9 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-100 text-sm pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors placeholder:text-zinc-600"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-500 transition-colors shrink-0 ${
                  showFilters || (filterDept || filterCredits || filterSemester)
                    ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
                    : 'bg-zinc-800/60 border-zinc-700/50 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <SlidersHorizontal size={13} />
                <span className="hidden sm:inline">Filters</span>
                {(filterDept || filterCredits || filterSemester) && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[9px] font-700 text-white">
                    {[filterDept, filterCredits, filterSemester].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>

            {/* Filter controls (collapsible) */}
            {showFilters && (
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Department */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-600 text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                      <Filter size={10} />
                      Department
                    </label>
                    <select
                      value={filterDept}
                      onChange={(e) => setFilterDept(e.target.value)}
                      className="w-full h-8 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-300 text-xs px-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500/50 appearance-none"
                    >
                      <option value="" className="bg-zinc-900">All Departments</option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d} className="bg-zinc-900">{d}</option>
                      ))}
                    </select>
                  </div>

                  {/* Credits */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-600 text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                      <Filter size={10} />
                      Credits
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {CREDIT_RANGES.map((cr) => (
                        <button
                          key={cr.value}
                          onClick={() => setFilterCredits(cr.value === filterCredits ? '' : cr.value)}
                          className={`h-7 px-2.5 rounded-md text-[11px] font-500 border transition-colors ${
                            filterCredits === cr.value && cr.value !== '' ?'bg-violet-600/30 border-violet-500/50 text-violet-300' :'bg-zinc-800/60 border-zinc-700/50 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {cr.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Semester */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-600 text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                      <Filter size={10} />
                      Semester
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {SEMESTERS.map((s) => (
                        <button
                          key={s}
                          onClick={() => setFilterSemester(s === filterSemester ? '' : s)}
                          className={`h-7 w-8 rounded-md text-[11px] font-500 border transition-colors ${
                            filterSemester === s
                              ? 'bg-violet-600/30 border-violet-500/50 text-violet-300'
                              : 'bg-zinc-800/60 border-zinc-700/50 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500">
                      Showing <span className="text-zinc-300 font-600">{filteredSubjects.length}</span> of {subjects.length} subjects
                    </span>
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      <X size={11} />
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Subject list */}
        {subjects.length === 0 ? (
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 py-16 flex flex-col items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center">
              <BookOpen size={24} className="text-zinc-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-500 text-zinc-300">No subjects yet</p>
              <p className="text-xs text-zinc-600 mt-1">Type a subject name above and press Enter to add it</p>
            </div>
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 py-12 flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center">
              <Search size={20} className="text-zinc-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-500 text-zinc-300">No subjects match your filters</p>
              <p className="text-xs text-zinc-600 mt-1">Try adjusting your search or filters</p>
            </div>
            <button
              onClick={clearFilters}
              className="mt-1 flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-zinc-800 border border-zinc-700/50 text-xs font-500 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X size={12} />
              Clear filters
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800/60 overflow-hidden">
            {/* Subject list header */}
            <div className="px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800/60 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Tag size={12} className="text-zinc-600" />
                <span className="text-[10px] font-600 uppercase tracking-widest text-zinc-600">
                  {hasActiveFilters ? `Filtered Results (${filteredSubjects.length})` : `Your Subjects (${subjects.length})`}
                </span>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <X size={10} />
                  Clear
                </button>
              )}
            </div>
            <div className="divide-y divide-zinc-800/40">
              {filteredSubjects.map((sub) => {
                const color = COLOR_OPTIONS[sub.colorIndex] || COLOR_OPTIONS[0];
                return (
                  <div key={sub.id}>
                    <div
                      className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-3 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === sub.id ? null : sub.id)}
                    >
                      {/* Color dot */}
                      <div className={`h-2.5 w-2.5 rounded-full ${color.dot} shrink-0`} />

                      {/* Subject name + code */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-500 text-zinc-200 truncate">{sub.name}</span>
                          {sub.code && (
                            <span className={`font-mono text-[10px] font-600 px-1.5 py-0.5 rounded ${color.bg} ${color.text} ${color.border} border shrink-0`}>
                              {sub.code}
                            </span>
                          )}
                        </div>
                        {/* Mobile meta row */}
                        <div className="flex items-center gap-2 mt-0.5 sm:hidden">
                          {sub.credits > 0 && <span className="text-[10px] text-zinc-500">{sub.credits} cr</span>}
                          {sub.department && <span className="text-[10px] text-zinc-600 truncate max-w-[100px]">{sub.department}</span>}
                        </div>
                      </div>

                      {/* Desktop meta */}
                      <div className="hidden sm:flex items-center gap-3 text-[11px] text-zinc-500 shrink-0">
                        {sub.credits > 0 && <span>{sub.credits} cr</span>}
                        {sub.semester && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-600 bg-zinc-800 text-zinc-400 border border-zinc-700">
                            Sem {sub.semester}
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-600 ${
                          sub.subjectType === 'Theory' ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' :
                          sub.subjectType === 'Lab' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>{sub.subjectType}</span>
                      </div>

                      {/* Expand chevron */}
                      <div className="shrink-0 text-zinc-600">
                        {expandedRow === sub.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { setEditSubject(sub); setModalOpen(true); }}
                          className="h-7 w-7 flex items-center justify-center rounded-md bg-zinc-800/60 border border-zinc-700/50 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/60 transition-colors"
                          title="Edit details"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id)}
                          disabled={deletingId === sub.id}
                          className="h-7 w-7 flex items-center justify-center rounded-md bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          title="Delete subject"
                        >
                          {deletingId === sub.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {expandedRow === sub.id && (
                      <div className="px-4 sm:px-6 py-4 bg-zinc-900/30 border-t border-zinc-800/40">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 text-xs">
                          <div className="flex items-start gap-2.5">
                            <MapPin size={13} className="text-zinc-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-zinc-500 mb-0.5">Room / Venue</p>
                              <p className="text-zinc-300 font-mono">{sub.room || '—'}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <User size={13} className="text-zinc-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-zinc-500 mb-0.5">Faculty</p>
                              <p className="text-zinc-300">{sub.teacher || '—'}</p>
                              {sub.teacherDesignation && <p className="text-zinc-600">{sub.teacherDesignation}</p>}
                            </div>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <Clock size={13} className="text-zinc-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-zinc-500 mb-0.5">Weekly Periods</p>
                              <p className="text-zinc-300 font-mono">{sub.periodsPerWeek} periods/week</p>
                            </div>
                          </div>
                          {sub.department && (
                            <div className="flex items-start gap-2.5">
                              <BookOpen size={13} className="text-zinc-600 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-zinc-500 mb-0.5">Department</p>
                                <p className="text-zinc-300">{sub.department}</p>
                              </div>
                            </div>
                          )}
                          {sub.semester && (
                            <div className="flex items-start gap-2.5">
                              <Tag size={13} className="text-zinc-600 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-zinc-500 mb-0.5">Semester</p>
                                <p className="text-zinc-300">Semester {sub.semester}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}