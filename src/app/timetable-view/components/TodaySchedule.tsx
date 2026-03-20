'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, User, Clock, CheckCircle2, Circle, PlayCircle, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const PERIODS = [
  { num: 1, time: '08:00–09:00', start: 8 * 60, end: 9 * 60 },
  { num: 2, time: '09:00–10:00', start: 9 * 60, end: 10 * 60 },
  { num: 3, time: '10:00–11:00', start: 10 * 60, end: 11 * 60 },
  { num: 4, time: '11:00–12:00', start: 11 * 60, end: 12 * 60 },
  { num: 5, time: '12:00–13:00', start: 12 * 60, end: 13 * 60 },
  { num: 6, time: '13:00–14:00', start: 13 * 60, end: 14 * 60 },
  { num: 7, time: '14:00–15:00', start: 14 * 60, end: 15 * 60 },
  { num: 8, time: '15:00–16:00', start: 15 * 60, end: 16 * 60 },
  { num: 9, time: '16:00–17:00', start: 16 * 60, end: 17 * 60 },
];

const COLOR_OPTIONS = [
  { text: 'text-violet-300', bg: 'bg-violet-500/10', border: 'border-violet-500/25' },
  { text: 'text-indigo-300', bg: 'bg-indigo-500/10', border: 'border-indigo-500/25' },
  { text: 'text-sky-300', bg: 'bg-sky-500/10', border: 'border-sky-500/25' },
  { text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25' },
  { text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/25' },
  { text: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/25' },
  { text: 'text-teal-300', bg: 'bg-teal-500/10', border: 'border-teal-500/25' },
  { text: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-500/25' },
];

type ClassStatus = 'completed' | 'ongoing' | 'upcoming';

interface TodayClass {
  period: number;
  time: string;
  subjectCode: string;
  subjectName: string;
  teacher: string;
  room: string;
  status: ClassStatus;
  colorText: string;
  colorBg: string;
  colorBorder: string;
}

function StatusIcon({ status }: { status: ClassStatus }) {
  if (status === 'completed') return <CheckCircle2 size={14} className="text-zinc-600 shrink-0" />;
  if (status === 'ongoing') return (
    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
      <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-sky-400 opacity-40" />
      <PlayCircle size={14} className="text-sky-400 relative" />
    </span>
  );
  return <Circle size={14} className="text-zinc-700 shrink-0" />;
}

function TodayScheduleSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3.5 border-b border-zinc-800/60">
        <div className="h-4 w-32 rounded bg-zinc-800/60 animate-pulse" />
        <div className="h-3 w-40 rounded bg-zinc-800/60 animate-pulse mt-1.5" />
      </div>
      <div className="flex-1 px-3 py-3 space-y-1.5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-zinc-800/30 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// All 7 days, index 0 = Sunday
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Weekdays only (Mon–Sat) for navigation
const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TodaySchedule() {
  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<TodayClass[]>([]);

  // Offset from today: 0 = today, -1 = yesterday, +1 = tomorrow
  const [dayOffset, setDayOffset] = useState(0);

  // Compute the target date based on offset
  const getTargetDate = useCallback((offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d;
  }, []);

  const targetDate = getTargetDate(dayOffset);
  const targetDayName = DAY_NAMES[targetDate.getDay()];
  const isToday = dayOffset === 0;

  // For non-school days (Sunday), show empty
  const isSchoolDay = targetDayName !== 'Sunday';

  const fetchSchedule = useCallback(async () => {
    if (!user || !isSchoolDay) {
      setClasses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      const [subjectsRes, entriesRes] = await Promise.all([
        supabase.from('subjects').select('*').eq('user_id', user.id),
        supabase.from('timetable_entries').select('*').eq('user_id', user.id).eq('day_of_week', targetDayName).order('period_number'),
      ]);

      const subjectMap = Object.fromEntries((subjectsRes.data || []).map((s: any) => [s.id, s]));
      const result: TodayClass[] = (entriesRes.data || []).map((entry: any) => {
        const sub = entry.subject_id ? subjectMap[entry.subject_id] : null;
        const periodInfo = PERIODS.find((p) => p.num === entry.period_number);
        const color = sub ? (COLOR_OPTIONS[sub.color_index] || COLOR_OPTIONS[0]) : { text: 'text-zinc-500', bg: 'bg-zinc-800/30', border: 'border-zinc-700/30' };

        let status: ClassStatus = 'upcoming';
        if (isToday && periodInfo) {
          if (nowMinutes >= periodInfo.end) status = 'completed';
          else if (nowMinutes >= periodInfo.start) status = 'ongoing';
        } else if (!isToday) {
          // For past days: all completed; for future days: all upcoming
          const targetDay = getTargetDate(dayOffset);
          const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
          if (targetDay < todayStart) {
            status = 'completed';
          } else {
            status = 'upcoming';
          }
        }

        return {
          period: entry.period_number,
          time: periodInfo?.time || '',
          subjectCode: sub?.code || '',
          subjectName: sub?.name || 'Free Period',
          teacher: sub?.teacher || '',
          room: entry.venue || sub?.room || '',
          status,
          colorText: color.text,
          colorBg: color.bg,
          colorBorder: color.border,
        };
      });

      setClasses(result);
    } catch {}
    setLoading(false);
  }, [user, targetDayName, isToday, isSchoolDay, dayOffset]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const dayLabel = isToday
    ? targetDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : targetDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const classCount = classes.filter((c) => c.subjectCode).length;

  if (loading) return <TodayScheduleSkeleton />;

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden flex flex-col h-full">
      {/* Header with day navigation */}
      <div className="px-4 py-3.5 border-b border-zinc-800/60">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-100">
                {isToday ? "Today's Schedule" : targetDayName}
              </h2>
              {isToday && (
                <span className="text-[9px] font-semibold uppercase tracking-wider text-sky-400 bg-sky-500/15 border border-sky-500/30 rounded px-1.5 py-0.5">
                  Today
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{dayLabel}</p>
          </div>
          {/* Navigation arrows */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setDayOffset((o) => o - 1)}
              className="flex items-center justify-center h-7 w-7 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 transition-colors"
              aria-label="Previous day"
            >
              <ChevronLeft size={14} />
            </button>
            {!isToday && (
              <button
                onClick={() => setDayOffset(0)}
                className="h-7 px-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-[10px] font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 transition-colors"
              >
                Today
              </button>
            )}
            <button
              onClick={() => setDayOffset((o) => o + 1)}
              className="flex items-center justify-center h-7 w-7 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 transition-colors"
              aria-label="Next day"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {!isSchoolDay ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
          <div className="h-12 w-12 rounded-xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center">
            <CalendarDays size={20} className="text-zinc-600" />
          </div>
          <div className="text-center px-4">
            <p className="text-xs font-medium text-zinc-400">No classes on Sunday</p>
            <p className="text-[11px] text-zinc-600 mt-1">Use the arrows to navigate to a school day.</p>
          </div>
        </div>
      ) : classes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
          <div className="h-12 w-12 rounded-xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center">
            <CalendarDays size={20} className="text-zinc-600" />
          </div>
          <div className="text-center px-4">
            <p className="text-xs font-medium text-zinc-400">No classes on {targetDayName}</p>
            <p className="text-[11px] text-zinc-600 mt-1">Assign periods in the timetable grid to see your schedule here.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-1.5">
          {classes.map((cls, idx) => {
            const isEnded = cls.status === 'completed';
            return (
              <div
                key={idx}
                className={`relative flex gap-3 items-start rounded-lg px-3 py-2.5 border transition-all duration-150 ${
                  cls.status === 'ongoing'
                    ? `${cls.colorBg} ${cls.colorBorder} shadow-sm shadow-sky-500/10`
                    : isEnded
                      ? 'bg-zinc-900/30 border-zinc-800/40 opacity-40'
                      : `${cls.colorBg} ${cls.colorBorder}`
                }`}
              >
                <div className="mt-0.5">
                  <StatusIcon status={cls.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <p className={`text-xs font-semibold leading-tight ${isEnded ? 'text-zinc-500' : 'text-zinc-100'}`}>
                      {cls.subjectName}
                    </p>
                    {cls.status === 'ongoing' && (
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-sky-400 bg-sky-500/15 border border-sky-500/30 rounded px-1.5 py-0.5">
                        Now
                      </span>
                    )}
                  </div>
                  {cls.subjectCode && (
                    <p className={`font-mono text-[10px] mt-0.5 ${isEnded ? 'text-zinc-600' : cls.colorText}`}>{cls.subjectCode}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <Clock size={9} className="text-zinc-600" />
                      <span className="font-mono text-[9px] text-zinc-600 tabular-nums">{cls.time}</span>
                    </div>
                    {cls.room && (
                      <div className="flex items-center gap-1">
                        <MapPin size={9} className="text-zinc-600" />
                        <span className="font-mono text-[9px] text-zinc-600">{cls.room}</span>
                      </div>
                    )}
                  </div>
                  {cls.teacher && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <User size={9} className="text-zinc-700" />
                      <span className="text-[9px] text-zinc-600">{cls.teacher}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="px-4 py-3 border-t border-zinc-800/60 bg-zinc-950/30">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-zinc-600">{classCount} classes · {classes.length - classCount} free slots</span>
          <span className="text-zinc-600 font-mono">08:00 – 17:00</span>
        </div>
      </div>
    </div>
  );
}