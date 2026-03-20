'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, X, Loader2, CalendarDays, AlertTriangle, Download, Share2, Bell, BellOff, Check, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Toaster } from 'sonner';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PERIODS = [
  { num: 1, time: '08:00–09:00', start: 8, startTime: '08:00', endTime: '09:00' },
  { num: 2, time: '09:00–10:00', start: 9, startTime: '09:00', endTime: '10:00' },
  { num: 3, time: '10:00–11:00', start: 10, startTime: '10:00', endTime: '11:00' },
  { num: 4, time: '11:00–12:00', start: 11, startTime: '11:00', endTime: '12:00' },
  { num: 5, time: '12:00–13:00', start: 12, startTime: '12:00', endTime: '13:00' },
  { num: 6, time: '13:00–14:00', start: 13, startTime: '13:00', endTime: '14:00' },
  { num: 7, time: '14:00–15:00', start: 14, startTime: '14:00', endTime: '15:00' },
  { num: 8, time: '15:00–16:00', start: 15, startTime: '15:00', endTime: '16:00' },
  { num: 9, time: '16:00–17:00', start: 16, startTime: '16:00', endTime: '17:00' },
];

const COLOR_OPTIONS = [
  { bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border-violet-500/30' },
  { bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/30' },
  { bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-sky-500/30' },
  { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/30' },
  { bg: 'bg-teal-500/15', text: 'text-teal-300', border: 'border-teal-500/30' },
  { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/30' },
  { bg: 'bg-pink-500/15', text: 'text-pink-300', border: 'border-pink-500/30' },
  { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/30' },
  { bg: 'bg-lime-500/15', text: 'text-lime-300', border: 'border-lime-500/30' },
  { bg: 'bg-fuchsia-500/15', text: 'text-fuchsia-300', border: 'border-fuchsia-500/30' },
  { bg: 'bg-red-500/15', text: 'text-red-300', border: 'border-red-500/30' },
  { bg: 'bg-yellow-500/15', text: 'text-yellow-300', border: 'border-yellow-500/30' },
  { bg: 'bg-green-500/15', text: 'text-green-300', border: 'border-green-500/30' },
  { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30' },
];

interface Subject {
  id: string;
  code: string;
  name: string;
  teacher: string;
  room: string;
  venues: string[];
  colorIndex: number;
}

interface TimetableEntry {
  id: string;
  subjectId: string;
  dayOfWeek: string;
  periodNumber: number;
  venue?: string;
  customStartTime?: string;
  customEndTime?: string;
}

type WeekSchedule = {
  [day: string]: {
    [period: number]: (Subject & { entryId: string; venue?: string; customStartTime?: string; customEndTime?: string }) | null;
  };
};

const getTodayIndex = () => {
  const d = new Date().getDay();
  if (d === 0) return -1;
  return d - 1;
};

const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── Parse time string "HH:MM" to minutes since midnight ──────────────────
function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

// ── Calculate how many period-rows a custom-timed card should span ────────
// Returns a fractional multiplier relative to the base cell height (88px)
function calcCardHeightMultiplier(customStart: string, customEnd: string, periodStart: string): number {
  const startMins = parseTimeToMinutes(customStart);
  const endMins = parseTimeToMinutes(customEnd);
  const periodStartMins = parseTimeToMinutes(periodStart);
  const durationMins = endMins - startMins;
  if (durationMins <= 0) return 1;
  // Each period row = 60 min. Offset within the period slot:
  const offsetMins = startMins - periodStartMins;
  // Total visual height in minutes from the period row start
  const totalMins = offsetMins + durationMins;
  return Math.max(1, totalMins / 60);
}

// ── Push Notification Helpers ──────────────────────────────────────────────

function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function scheduleClassReminders(schedule: WeekSchedule) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const existingTimers = (window as any).__classReminderTimers as number[] | undefined;
  if (existingTimers) existingTimers.forEach((id) => clearTimeout(id));
  (window as any).__classReminderTimers = [];

  const now = new Date();
  const todayName = DAY_NAMES_FULL[now.getDay()];
  const todaySchedule = schedule[todayName];
  if (!todaySchedule) return;

  PERIODS.forEach((period) => {
    const entry = todaySchedule[period.num];
    if (!entry) return;

    const classTime = new Date();
    classTime.setHours(period.start, 0, 0, 0);
    const reminderTime = new Date(classTime.getTime() - 10 * 60 * 1000);
    const msUntilReminder = reminderTime.getTime() - now.getTime();

    if (msUntilReminder > 0) {
      const timerId = window.setTimeout(() => {
        new Notification(`Class Reminder: ${entry.name}`, {
          body: `Period ${period.num} starts in 10 minutes (${period.time})${entry.venue || entry.room ? ` · Room ${entry.venue || entry.room}` : ''}`,
          icon: '/favicon.ico',
          tag: `class-reminder-${period.num}`,
        });
      }, msUntilReminder);
      ((window as any).__classReminderTimers as number[]).push(timerId);
    }
  });
}

// ── Overlap warning toast ──────────────────────────────────────────────────

function OverlapToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-950/90 border border-amber-700/60 shadow-2xl shadow-black/60 backdrop-blur-sm max-w-sm w-full mx-4 animate-fade-in">
      <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-600 text-amber-300">Period Conflict Detected</p>
        <p className="text-[11px] text-amber-500 mt-0.5 leading-relaxed">{message}</p>
      </div>
      <button onClick={onDismiss} className="text-amber-600 hover:text-amber-400 transition-colors shrink-0">
        <X size={13} />
      </button>
    </div>
  );
}

// ── Period Picker Modal ────────────────────────────────────────────────────

function PeriodPickerModal({
  isOpen,
  onClose,
  onSelect,
  subjects,
  day,
  period,
  saving,
  existingEntry,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (subjectId: string | null, venue?: string, customStartTime?: string, customEndTime?: string) => void;
  subjects: Subject[];
  day: string;
  period: number;
  saving: boolean;
  existingEntry: (Subject & { entryId: string; venue?: string; customStartTime?: string; customEndTime?: string }) | null;
}) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const periodInfo = PERIODS.find((p) => p.num === period);

  useEffect(() => {
    if (isOpen) {
      setSelectedSubjectId(null);
      setSelectedVenue('');
      setUseCustomTime(false);
      setCustomStart(periodInfo?.startTime || '');
      setCustomEnd(periodInfo?.endTime || '');
    }
  }, [isOpen, period]);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  if (!isOpen) return null;

  const handleSubjectClick = (subId: string) => {
    setSelectedSubjectId(subId);
    const sub = subjects.find((s) => s.id === subId);
    setSelectedVenue(sub?.room || '');
  };

  const handleConfirm = () => {
    if (selectedSubjectId === null) return;
    const startTime = useCustomTime ? customStart : undefined;
    const endTime = useCustomTime ? customEnd : undefined;
    onSelect(selectedSubjectId, selectedVenue, startTime, endTime);
  };

  const displayTime = useCustomTime
    ? (customStart && customEnd ? `${customStart}–${customEnd}` : periodInfo?.time || '')
    : periodInfo?.time || '';

  // Sort subjects alphabetically
  const sortedSubjects = [...subjects].sort((a, b) => a.name.localeCompare(b.name));

  // Is the cell currently empty/free?
  const isCellFree = !existingEntry;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl shadow-black/60 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-800/60">
          <div>
            <h3 className="text-sm font-600 text-zinc-100">Assign Period</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">{day} · Period {period} · {displayTime}</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {existingEntry && (
          <div className="mx-3 mt-3 flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-amber-950/60 border border-amber-700/40">
            <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-600 text-amber-300">Slot already occupied</p>
              <p className="text-[10px] text-amber-600 mt-0.5 leading-relaxed">
                <span className="text-amber-400 font-600">{existingEntry.name}</span> ({existingEntry.code}) is currently assigned here. Selecting a new subject will replace it.
              </p>
            </div>
          </div>
        )}

        <div className="p-3 max-h-56 overflow-y-auto scrollbar-thin space-y-1.5">
          {/* Only show Clear Period if the cell is NOT already free */}
          {!isCellFree && (
            <button
              onClick={() => onSelect(null)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-800/40 border border-zinc-700/40 hover:bg-zinc-700/40 transition-colors text-left"
            >
              <div className="h-7 w-7 rounded-md bg-zinc-700/60 flex items-center justify-center shrink-0">
                <X size={13} className="text-zinc-500" />
              </div>
              <span className="text-sm text-zinc-400">Clear period (Free)</span>
            </button>
          )}
          {sortedSubjects.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-zinc-500">No subjects added yet.</p>
              <p className="text-[11px] text-zinc-600 mt-1">Add subjects in the Subjects page first.</p>
            </div>
          ) : (
            sortedSubjects.map((sub) => {
              const color = COLOR_OPTIONS[sub.colorIndex] || COLOR_OPTIONS[0];
              const isCurrentlyAssigned = existingEntry?.id === sub.id;
              const isSelected = selectedSubjectId === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => handleSubjectClick(sub.id)}
                  disabled={saving}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border ${color.border} ${color.bg} hover:opacity-80 transition-opacity text-left ${isSelected ? 'ring-2 ring-violet-500/60' : ''} ${isCurrentlyAssigned ? 'ring-1 ring-amber-500/40' : ''}`}
                >
                  <div className={`h-7 w-7 rounded-md ${color.bg} border ${color.border} flex items-center justify-center shrink-0`}>
                    <span className={`text-[10px] font-700 ${color.text}`}>{sub.code ? sub.code.slice(0, 2) : sub.name.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-600 ${color.text}`}>{sub.name}</p>
                    {sub.code && <p className="text-[10px] text-zinc-500 font-mono">{sub.code}</p>}
                  </div>
                  {isCurrentlyAssigned && (
                    <span className="text-[9px] font-600 text-amber-500 bg-amber-950/60 border border-amber-700/40 rounded px-1.5 py-0.5 shrink-0">Current</span>
                  )}
                  {saving && <Loader2 size={12} className="animate-spin text-zinc-500 shrink-0" />}
                </button>
              );
            })
          )}
        </div>

        {/* Venue selector — shown after a subject is selected */}
        {selectedSubject && (
          <div className="px-3 pb-3 space-y-3 border-t border-zinc-800 pt-3">
            {/* Venue — only pre-defined venues, no custom input */}
            {(selectedSubject.room || (selectedSubject.venues && selectedSubject.venues.length > 0)) && (
              <div className="space-y-2">
                <label className="text-[11px] font-600 text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={11} />
                  Select Venue
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSubject.room && (
                    <button
                      onClick={() => setSelectedVenue(selectedSubject.room)}
                      className={`h-7 px-2.5 rounded-md text-[11px] font-500 border transition-colors ${selectedVenue === selectedSubject.room ? 'bg-violet-600/30 border-violet-500/50 text-violet-300' : 'bg-zinc-800/60 border-zinc-700/50 text-zinc-400 hover:text-zinc-200'}`}
                    >
                      {selectedSubject.room}
                    </button>
                  )}
                  {selectedSubject.venues?.filter((v) => v && v !== selectedSubject.room).map((v) => (
                    <button
                      key={v}
                      onClick={() => setSelectedVenue(v)}
                      className={`h-7 px-2.5 rounded-md text-[11px] font-500 border transition-colors ${selectedVenue === v ? 'bg-violet-600/30 border-violet-500/50 text-violet-300' : 'bg-zinc-800/60 border-zinc-700/50 text-zinc-400 hover:text-zinc-200'}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Timing */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-600 text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={11} />
                  Timing
                </label>
                <button
                  onClick={() => setUseCustomTime(!useCustomTime)}
                  className={`text-[10px] font-600 px-2 py-0.5 rounded border transition-colors ${useCustomTime ? 'bg-violet-600/20 border-violet-500/40 text-violet-300' : 'bg-zinc-800/60 border-zinc-700/50 text-zinc-500 hover:text-zinc-300'}`}
                >
                  {useCustomTime ? 'Custom' : 'Full Hour'}
                </button>
              </div>
              {!useCustomTime ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/40 border border-zinc-700/40">
                  <Clock size={12} className="text-zinc-500 shrink-0" />
                  <span className="text-[11px] text-zinc-400 font-mono">{periodInfo?.time}</span>
                  <span className="text-[10px] text-zinc-600 ml-auto">Full hour (default)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 space-y-0.5">
                    <label className="text-[10px] text-zinc-600">From</label>
                    <input
                      type="time"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full h-8 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-200 text-xs px-2.5 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                    />
                  </div>
                  <span className="text-zinc-600 mt-4">–</span>
                  <div className="flex-1 space-y-0.5">
                    <label className="text-[10px] text-zinc-600">To</label>
                    <input
                      type="time"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full h-8 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-200 text-xs px-2.5 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleConfirm}
              disabled={saving}
              className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-xs font-600 text-white transition-colors"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              Assign to {day}, P{period}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function TimetableGridSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/60">
        <div className="space-y-1.5">
          <div className="h-4 w-32 rounded bg-zinc-800/60 animate-pulse" />
          <div className="h-3 w-48 rounded bg-zinc-800/60 animate-pulse" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-7 w-7 rounded-md bg-zinc-800/60 animate-pulse" />
          <div className="h-7 w-14 rounded-md bg-zinc-800/60 animate-pulse" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr>
              <th className="w-24 px-3 py-2.5 border-b border-r border-zinc-800/60">
                <div className="h-3 w-12 rounded bg-zinc-800/60 animate-pulse" />
              </th>
              {DAYS.map((d) => (
                <th key={d} className="px-2 py-2.5 border-b border-r border-zinc-800/60 last:border-r-0">
                  <div className="h-3 w-8 rounded bg-zinc-800/60 animate-pulse mx-auto" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((p) => (
              <tr key={p.num}>
                <td className="px-3 py-1.5 border-b border-r border-zinc-800/40 bg-zinc-950/30">
                  <div className="h-3 w-8 rounded bg-zinc-800/60 animate-pulse mb-1" />
                  <div className="h-2.5 w-16 rounded bg-zinc-800/40 animate-pulse" />
                </td>
                {DAYS.map((d) => (
                  <td key={d} className="px-1.5 py-1.5 border-b border-r border-zinc-800/40 last:border-r-0">
                    <div className="h-[88px] rounded-md bg-zinc-800/30 animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Share Modal ────────────────────────────────────────────────────────────

function ShareModal({
  isOpen,
  onClose,
  schedule,
  subjects,
}: {
  isOpen: boolean;
  onClose: () => void;
  schedule: WeekSchedule;
  subjects: Subject[];
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const buildTextTimetable = () => {
    let text = '📅 My Class Timetable\n';
    text += '═'.repeat(40) + '\n';
    DAYS.forEach((day) => {
      const dayEntries = PERIODS.filter((p) => schedule[day]?.[p.num]);
      if (dayEntries.length === 0) return;
      text += `\n📌 ${day}\n`;
      dayEntries.forEach((p) => {
        const entry = schedule[day][p.num];
        if (entry) {
          const timeDisplay = entry.customStartTime && entry.customEndTime
            ? `${entry.customStartTime}–${entry.customEndTime}`
            : p.time;
          text += `  P${p.num} (${timeDisplay}): ${entry.name} [${entry.code}]`;
          const venue = entry.venue || entry.room;
          if (venue) text += ` · Room ${venue}`;
          text += '\n';
        }
      });
    });
    text += '\n─'.repeat(40) + '\nShared via ClassScheduler';
    return text;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildTextTimetable());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      toast.error('Native sharing not supported on this browser');
      return;
    }
    try {
      await navigator.share({
        title: 'My Class Timetable',
        text: buildTextTimetable(),
      });
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl shadow-black/60 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-800/60">
          <div>
            <h3 className="text-sm font-600 text-zinc-100">Share Timetable</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">Export or share your weekly schedule</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/60 p-3 max-h-48 overflow-y-auto scrollbar-thin">
            <pre className="text-[10px] font-mono text-zinc-400 whitespace-pre-wrap leading-relaxed">{buildTextTimetable()}</pre>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-lg border text-sm font-500 transition-colors ${copied ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-zinc-800/60 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/60 hover:text-zinc-100'}`}
            >
              {copied ? <Check size={14} /> : <Download size={14} />}
              {copied ? 'Copied!' : 'Copy Text'}
            </button>
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg bg-violet-500/15 border border-violet-500/30 text-sm font-500 text-violet-300 hover:bg-violet-500/25 transition-colors"
              >
                <Share2 size={14} />
                Share
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function TimetableGrid() {
  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schedule, setSchedule] = useState<WeekSchedule>({});
  const [hoveredCell, setHoveredCell] = useState<{ day: string; period: number } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCell, setPickerCell] = useState<{ day: string; period: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const TODAY_INDEX = getTodayIndex();

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [subjectsRes, entriesRes] = await Promise.all([
        supabase.from('subjects').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('timetable_entries').select('*').eq('user_id', user.id),
      ]);

      const subjectList: Subject[] = (subjectsRes.data || []).map((s: any) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        teacher: s.teacher || '',
        room: s.room || '',
        venues: s.venues || [],
        colorIndex: s.color_index || 0,
      }));
      setSubjects(subjectList);

      const subjectMap = Object.fromEntries(subjectList.map((s) => [s.id, s]));
      const newSchedule: WeekSchedule = {};
      DAYS.forEach((d) => {
        newSchedule[d] = {};
        PERIODS.forEach((p) => { newSchedule[d][p.num] = null; });
      });

      (entriesRes.data || []).forEach((entry: any) => {
        const sub = entry.subject_id ? subjectMap[entry.subject_id] : null;
        if (newSchedule[entry.day_of_week]) {
          newSchedule[entry.day_of_week][entry.period_number] = sub
            ? { ...sub, entryId: entry.id, venue: entry.venue || '', customStartTime: entry.custom_start_time || '', customEndTime: entry.custom_end_time || '' }
            : null;
        }
      });
      setSchedule(newSchedule);

      scheduleClassReminders(newSchedule);
    } catch {}
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEnableReminders = async () => {
    const granted = await requestNotificationPermission();
    const newPerm = getNotificationPermission();
    setNotifPermission(newPerm);
    if (granted) {
      scheduleClassReminders(schedule);
      toast.success('Class reminders enabled! You\'ll be notified 10 min before each class.');
    } else {
      toast.error('Notification permission denied. Please enable it in browser settings.');
    }
  };

  const handleCellClick = (day: string, period: number) => {
    setPickerCell({ day, period });
    setPickerOpen(true);
  };

  const handleSubjectSelect = async (subjectId: string | null, venue?: string, customStartTime?: string, customEndTime?: string) => {
    if (!user || !pickerCell) return;
    const { day, period } = pickerCell;
    const existingEntry = schedule[day]?.[period] ?? null;

    if (subjectId !== null && existingEntry && existingEntry.id !== subjectId) {
      const newSubject = subjects.find((s) => s.id === subjectId);
      setOverlapWarning(
        `"${newSubject?.name || 'Subject'}" replaced "${existingEntry.name}" on ${day}, Period ${period}.`
      );
    }

    setSaving(true);
    try {
      if (subjectId === null) {
        await supabase
          .from('timetable_entries')
          .delete()
          .eq('user_id', user.id)
          .eq('day_of_week', day)
          .eq('period_number', period);
        toast.success('Period cleared successfully');
      } else {
        await supabase
          .from('timetable_entries')
          .upsert(
            {
              user_id: user.id,
              subject_id: subjectId,
              day_of_week: day,
              period_number: period,
              venue: venue || '',
              custom_start_time: customStartTime || null,
              custom_end_time: customEndTime || null,
            },
            { onConflict: 'user_id,day_of_week,period_number' }
          );
        const assignedSubject = subjects.find((s) => s.id === subjectId);
        toast.success(`${assignedSubject?.name || 'Subject'} assigned to ${day}, Period ${period}`);
      }
      await fetchData();
      setPickerOpen(false);
      setPickerCell(null);
    } catch {
      toast.error('Failed to save. Please try again.');
    }
    setSaving(false);
  };

  const currentPickerEntry = pickerCell ? (schedule[pickerCell.day]?.[pickerCell.period] ?? null) : null;

  if (loading) return <TimetableGridSkeleton />;

  // Build a map: cellKey -> rowSpan for cells that have custom timing spanning multiple rows
  // Also build a set of cells that are "absorbed" (hidden) because a previous cell spans over them
  const cellRowSpan = new Map<string, number>();
  const absorbedCells = new Set<string>();

  DAYS.forEach((day) => {
    PERIODS.forEach((period) => {
      const entry = schedule[day]?.[period.num];
      if (entry?.customStartTime && entry?.customEndTime) {
        const startMins = parseTimeToMinutes(entry.customStartTime);
        const endMins = parseTimeToMinutes(entry.customEndTime);
        const durationMins = endMins - startMins;
        if (durationMins <= 0) return;

        // How many minutes does this card extend past the end of the current period slot?
        const periodEndMins = parseTimeToMinutes(period.startTime) + 60;
        const overflowMins = endMins - periodEndMins;

        if (overflowMins > 0) {
          // Number of additional period rows this card needs to span into
          const extraRows = Math.ceil(overflowMins / 60);
          const totalSpan = 1 + extraRows;
          cellRowSpan.set(`${day}-${period.num}`, totalSpan);
          for (let i = 1; i <= extraRows; i++) {
            absorbedCells.add(`${day}-${period.num + i}`);
          }
        }
      }
    });
  });

  return (
    <>
      <Toaster position="bottom-right" theme="dark" richColors />
      {overlapWarning && (
        <OverlapToast message={overlapWarning} onDismiss={() => setOverlapWarning(null)} />
      )}

      <PeriodPickerModal
        isOpen={pickerOpen}
        onClose={() => { setPickerOpen(false); setPickerCell(null); }}
        onSelect={handleSubjectSelect}
        subjects={subjects}
        day={pickerCell?.day || ''}
        period={pickerCell?.period || 0}
        saving={saving}
        existingEntry={currentPickerEntry}
      />

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        schedule={schedule}
        subjects={subjects}
      />

      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/60">
          <div>
            <h2 className="text-sm font-600 text-zinc-100">Weekly Timetable</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">Click any cell to assign or change a period</p>
          </div>
          <div className="flex items-center gap-1.5">
            {notifPermission !== 'unsupported' && (
              <button
                onClick={notifPermission === 'granted' ? undefined : handleEnableReminders}
                title={notifPermission === 'granted' ? 'Reminders active' : 'Enable class reminders'}
                className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${notifPermission === 'granted' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 cursor-default' : 'bg-zinc-800 border-zinc-700/50 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'}`}
              >
                {notifPermission === 'granted' ? <Bell size={13} /> : <BellOff size={13} />}
              </button>
            )}
            <button
              onClick={() => setShareOpen(true)}
              title="Share timetable"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800 border border-zinc-700/50 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
            >
              <Share2 size={13} />
            </button>
          </div>
        </div>

        {subjects.length === 0 && (
          <div className="mx-4 mt-4 flex items-start gap-3 px-4 py-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <CalendarDays size={15} className="text-violet-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-600 text-violet-300">No subjects added yet</p>
              <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                Go to <span className="text-zinc-300">Subjects</span> to add your subjects, then click any cell to assign periods.
              </p>
            </div>
          </div>
        )}

        {notifPermission === 'default' && subjects.length > 0 && (
          <div className="mx-4 mt-3 flex items-center gap-3 px-4 py-2.5 rounded-lg bg-zinc-800/40 border border-zinc-700/40">
            <Bell size={13} className="text-zinc-400 shrink-0" />
            <p className="text-[11px] text-zinc-400 flex-1">Enable push notifications to get class reminders 10 min before each period.</p>
            <button
              onClick={handleEnableReminders}
              className="text-[11px] font-600 text-violet-400 hover:text-violet-300 transition-colors shrink-0"
            >
              Enable
            </button>
          </div>
        )}

        {/* Grid */}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr>
                <th className="w-24 px-3 py-2.5 text-left border-b border-r border-zinc-800/60">
                  <span className="text-[10px] font-600 uppercase tracking-widest text-zinc-600">Period</span>
                </th>
                {DAYS.map((day, idx) => (
                  <th
                    key={day}
                    className={`px-2 py-2.5 text-center border-b border-r border-zinc-800/60 last:border-r-0 ${idx === TODAY_INDEX ? 'bg-violet-500/8' : ''}`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`text-[11px] font-600 uppercase tracking-wider ${idx === TODAY_INDEX ? 'text-violet-400' : 'text-zinc-500'}`}>
                        {DAY_SHORT[idx]}
                      </span>
                      {idx === TODAY_INDEX && (
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map((period) => (
                <tr key={period.num} className="group">
                  <td className="px-3 py-1.5 border-b border-r border-zinc-800/40 bg-zinc-950/30 align-top">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-600 text-zinc-400 tabular-nums">P{period.num}</span>
                      <span className="text-[10px] font-mono text-zinc-600 tabular-nums">{period.time}</span>
                    </div>
                  </td>
                  {DAYS.map((day, dayIdx) => {
                    const cellKey = `${day}-${period.num}`;
                    const isAbsorbed = absorbedCells.has(cellKey);
                    const rowSpan = cellRowSpan.get(cellKey) || 1;
                    const entry = schedule[day]?.[period.num] ?? null;
                    const isToday = dayIdx === TODAY_INDEX;
                    const isHovered = hoveredCell?.day === day && hoveredCell?.period === period.num;
                    const color = entry ? (COLOR_OPTIONS[entry.colorIndex] || COLOR_OPTIONS[0]) : null;
                    const displayVenue = entry?.venue || entry?.room || '';
                    const hasCustomTime = !!(entry?.customStartTime && entry?.customEndTime);
                    const displayTime = hasCustomTime
                      ? `${entry!.customStartTime}–${entry!.customEndTime}`
                      : '';

                    // If this cell is absorbed by a rowSpan from a previous period, skip rendering
                    if (isAbsorbed) {
                      return null;
                    }

                    return (
                      <td
                        key={day}
                        rowSpan={rowSpan > 1 ? rowSpan : undefined}
                        className={`px-1 py-1 border-b border-r border-zinc-800/40 last:border-r-0 align-top transition-colors duration-100 cursor-pointer ${isToday ? 'bg-violet-500/5' : ''} ${isHovered ? 'bg-zinc-800/40' : ''}`}
                        onMouseEnter={() => setHoveredCell({ day, period: period.num })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => handleCellClick(day, period.num)}
                      >
                        {entry ? (
                          <div
                            className={`rounded-md px-2 py-1.5 border ${color!.border} ${color!.bg} cursor-pointer transition-all duration-150 h-full min-h-[88px] flex flex-col justify-start gap-0.5 ${isHovered ? 'shadow-md shadow-black/30' : ''}`}
                          >
                            <p className={`text-[11px] font-700 ${color!.text} leading-snug break-words`}>
                              {entry.name}
                            </p>
                            {entry.code && (
                              <p className="font-mono text-[9px] text-zinc-500 leading-tight">{entry.code}</p>
                            )}
                            {entry.teacher && (
                              <p className="text-[10px] font-700 text-zinc-200 leading-snug break-words">{entry.teacher}</p>
                            )}
                            {displayVenue && (
                              <div className="flex items-start gap-0.5 mt-auto">
                                <MapPin size={8} className="text-zinc-400 shrink-0 mt-0.5" />
                                <span className="text-[9px] font-700 font-mono text-zinc-200 break-words leading-tight">{displayVenue}</span>
                              </div>
                            )}
                            {displayTime && (
                              <p className="text-[8px] font-mono text-zinc-500 leading-tight">{displayTime}</p>
                            )}
                          </div>
                        ) : (
                          <div className="min-h-[88px] flex items-center justify-center group/empty">
                            <Plus size={12} className="text-zinc-700 group-hover/empty:text-zinc-500 transition-colors" />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        {subjects.length > 0 && (
          <div className="px-5 py-3 border-t border-zinc-800/60 flex flex-wrap gap-3">
            {subjects.map((sub) => {
              const color = COLOR_OPTIONS[sub.colorIndex] || COLOR_OPTIONS[0];
              return (
                <div key={sub.id} className="flex items-center gap-1.5">
                  <div className={`h-2.5 w-2.5 rounded-sm ${color.bg} border ${color.border}`} />
                  <span className="text-[10px] text-zinc-500">{sub.code || sub.name.slice(0, 8)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}