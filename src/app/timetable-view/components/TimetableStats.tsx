'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, BookOpen, Coffee, CalendarCheck, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Icon from '@/components/ui/AppIcon';


const PERIODS_INFO = [
  { num: 1, start: 8 * 60, end: 9 * 60, time: '08:00–09:00' },
  { num: 2, start: 9 * 60, end: 10 * 60, time: '09:00–10:00' },
  { num: 3, start: 10 * 60, end: 11 * 60, time: '10:00–11:00' },
  { num: 4, start: 11 * 60, end: 12 * 60, time: '11:00–12:00' },
  { num: 5, start: 12 * 60, end: 13 * 60, time: '12:00–13:00' },
  { num: 6, start: 13 * 60, end: 14 * 60, time: '13:00–14:00' },
  { num: 7, start: 14 * 60, end: 15 * 60, time: '14:00–15:00' },
  { num: 8, start: 15 * 60, end: 16 * 60, time: '15:00–16:00' },
  { num: 9, start: 16 * 60, end: 17 * 60, time: '16:00–17:00' },
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 space-y-2.5">
          <div className="h-8 w-8 rounded-lg bg-zinc-800/60 animate-pulse" />
          <div className="h-6 w-12 rounded bg-zinc-800/60 animate-pulse" />
          <div className="h-3 w-20 rounded bg-zinc-800/60 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default function TimetableStats() {
  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    classesToday: 0,
    nextClass: null as { name: string; time: string; minutesAway: number } | null,
    ongoingClass: null as { name: string; room: string; endTime: string } | null,
    freePeriods: 0,
    weeklyLoad: 0,
  });

  const fetchStats = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const todayName = DAY_NAMES[new Date().getDay()];
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      const [subjectsRes, todayEntriesRes, allEntriesRes] = await Promise.all([
        supabase.from('subjects').select('*').eq('user_id', user.id),
        supabase.from('timetable_entries').select('*').eq('user_id', user.id).eq('day_of_week', todayName).order('period_number'),
        supabase.from('timetable_entries').select('*').eq('user_id', user.id),
      ]);

      const subjectMap = Object.fromEntries((subjectsRes.data || []).map((s: any) => [s.id, s]));
      const todayEntries = (todayEntriesRes.data || []).filter((e: any) => e.subject_id);
      const allEntries = (allEntriesRes.data || []).filter((e: any) => e.subject_id);

      // Classes today
      const classesToday = todayEntries.length;

      // Free periods today (out of 9 total)
      const freePeriods = 9 - classesToday;

      // Weekly load
      const weeklyLoad = allEntries.length;

      // Ongoing and next class
      let ongoingClass = null;
      let nextClass = null;

      for (const entry of todayEntries) {
        const periodInfo = PERIODS_INFO.find((p) => p.num === entry.period_number);
        const sub = subjectMap[entry.subject_id];
        if (!periodInfo || !sub) continue;

        if (nowMinutes >= periodInfo.start && nowMinutes < periodInfo.end) {
          ongoingClass = {
            name: sub.name,
            room: sub.room || '',
            endTime: periodInfo.time.split('–')[1],
          };
        } else if (nowMinutes < periodInfo.start && !nextClass) {
          nextClass = {
            name: sub.name,
            time: periodInfo.time.split('–')[0],
            minutesAway: periodInfo.start - nowMinutes,
          };
        }
      }

      setStats({ classesToday, nextClass, ongoingClass, freePeriods, weeklyLoad });
    } catch {}
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) return <StatsSkeleton />;

  const STATS = [
    {
      label: 'Classes Today',
      value: String(stats.classesToday),
      subtext: new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
      icon: CalendarCheck,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
      trend: null,
    },
    {
      label: 'Next Class',
      value: stats.nextClass ? `${stats.nextClass.minutesAway}m` : '—',
      subtext: stats.nextClass ? `${stats.nextClass.name} — ${stats.nextClass.time}` : 'No more classes today',
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      trend: stats.nextClass && stats.nextClass.minutesAway <= 15 ? 'warning' : null,
    },
    {
      label: 'Ongoing Now',
      value: stats.ongoingClass ? stats.ongoingClass.name.split(' ')[0] : '—',
      subtext: stats.ongoingClass ? `${stats.ongoingClass.room ? stats.ongoingClass.room + ' · ' : ''}ends ${stats.ongoingClass.endTime}` : 'No class right now',
      icon: AlertCircle,
      color: stats.ongoingClass ? 'text-green-400' : 'text-zinc-500',
      bg: stats.ongoingClass ? 'bg-green-500/10' : 'bg-zinc-800/30',
      border: stats.ongoingClass ? 'border-green-500/20' : 'border-zinc-700/30',
      trend: stats.ongoingClass ? 'active' : null,
    },
    {
      label: 'Free Periods',
      value: String(stats.freePeriods),
      subtext: 'free slots today',
      icon: Coffee,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
      trend: null,
    },
    {
      label: 'Weekly Load',
      value: String(stats.weeklyLoad),
      subtext: 'periods this week',
      icon: BookOpen,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      trend: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5 gap-3">
      {STATS?.map((stat) => {
        const Icon = stat?.icon;
        return (
          <div
            key={stat?.label}
            className={`relative rounded-xl border ${stat?.border} ${stat?.bg} p-4 flex flex-col gap-2.5 transition-all duration-150 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20`}
          >
            {stat?.trend === 'active' && (
              <span className="absolute top-3 right-3 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
            )}
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat?.bg} border ${stat?.border}`}>
              <Icon size={16} className={stat?.color} />
            </div>
            <div>
              <p className={`text-xl font-bold tabular-nums ${stat?.color} leading-tight truncate`}>{stat?.value}</p>
              <p className="text-[11px] font-500 text-zinc-400 mt-0.5 leading-snug truncate">{stat?.subtext}</p>
            </div>
            <p className="text-[10px] font-500 uppercase tracking-wider text-zinc-600">{stat?.label}</p>
          </div>
        );
      })}
    </div>
  );
}