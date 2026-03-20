'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FlaskConical, BookOpen, Clock, CalendarDays } from 'lucide-react';

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CHART_COLORS = [
  '#7c3aed', '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#14b8a6', '#f97316',
];

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 shadow-xl text-xs">
        <p className="font-600 text-zinc-100 mb-1.5">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2 mb-0.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: p.fill }} />
            <span className="text-zinc-400 capitalize">{p.dataKey}:</span>
            <span className="text-zinc-200 font-600 tabular-nums">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 shadow-xl text-xs">
        <p className="font-600 text-zinc-100">{payload[0].name}</p>
        <p className="text-zinc-400 mt-0.5">{payload[0].value} periods/week</p>
      </div>
    );
  }
  return null;
};

function ChartSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
            <div className="h-3 w-20 rounded bg-zinc-800/60 animate-pulse mb-2" />
            <div className="h-6 w-12 rounded bg-zinc-800/60 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5">
          <div className="h-4 w-36 rounded bg-zinc-800/60 animate-pulse mb-1" />
          <div className="h-3 w-48 rounded bg-zinc-800/60 animate-pulse mb-4" />
          <div className="h-48 rounded-lg bg-zinc-800/30 animate-pulse" />
        </div>
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5">
          <div className="h-4 w-28 rounded bg-zinc-800/60 animate-pulse mb-1" />
          <div className="h-3 w-40 rounded bg-zinc-800/60 animate-pulse mb-4" />
          <div className="h-40 rounded-full bg-zinc-800/30 animate-pulse mx-auto w-40" />
        </div>
      </div>
    </div>
  );
}

export default function WeeklyChart() {
  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [dailyLoad, setDailyLoad] = useState<{ day: string; classes: number; isToday?: boolean }[]>([]);
  const [subjectDistribution, setSubjectDistribution] = useState<{ name: string; value: number; fill: string }[]>([]);
  const [totalPeriods, setTotalPeriods] = useState(0);
  const [labSessions, setLabSessions] = useState(0);
  const [theorySessions, setTheorySessions] = useState(0);
  const [classHoursPerWeek, setClassHoursPerWeek] = useState(0);
  const [daysWithClasses, setDaysWithClasses] = useState(0);

  const fetchChartData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [subjectsRes, entriesRes] = await Promise.all([
        supabase.from('subjects').select('*').eq('user_id', user.id),
        supabase.from('timetable_entries').select('*').eq('user_id', user.id),
      ]);

      const subjects = subjectsRes.data || [];
      const entries = entriesRes.data || [];

      // Daily load
      const dayCount: Record<string, number> = {};
      DAYS_ORDER.forEach((d) => { dayCount[d] = 0; });
      entries.filter((e: any) => e.subject_id).forEach((e: any) => {
        if (dayCount[e.day_of_week] !== undefined) dayCount[e.day_of_week]++;
      });

      const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
      const daily = DAYS_ORDER.map((d, i) => ({
        day: DAY_SHORT[i],
        classes: dayCount[d],
        isToday: d === todayName,
      }));
      setDailyLoad(daily);

      // Subject distribution
      const subjectMap = Object.fromEntries(subjects.map((s: any) => [s.id, s]));
      const subjectCount: Record<string, number> = {};
      entries.filter((e: any) => e.subject_id).forEach((e: any) => {
        subjectCount[e.subject_id] = (subjectCount[e.subject_id] || 0) + 1;
      });

      const distribution = Object.entries(subjectCount).map(([id, count], idx) => {
        const sub = subjectMap[id];
        return {
          name: sub?.name || 'Unknown',
          value: count,
          fill: CHART_COLORS[idx % CHART_COLORS.length],
        };
      }).sort((a, b) => b.value - a.value);

      setSubjectDistribution(distribution);

      const assignedEntries = entries.filter((e: any) => e.subject_id);
      setTotalPeriods(assignedEntries.length);

      // Lab sessions: entries where subject_type is 'Lab' or 'Theory + Lab'
      let labCount = 0;
      let theoryCount = 0;
      assignedEntries.forEach((e: any) => {
        const sub = subjectMap[e.subject_id];
        const type = sub?.subject_type || '';
        if (type === 'Lab') labCount++;
        else if (type === 'Theory + Lab') { labCount++; theoryCount++; }
        else theoryCount++;
      });
      setLabSessions(labCount);
      setTheorySessions(theoryCount);

      // Class hours per week: each period = 1 hour (custom timing not factored for simplicity)
      setClassHoursPerWeek(assignedEntries.length);

      // Days with at least one class
      const daysActive = DAYS_ORDER.filter((d) => dayCount[d] > 0).length;
      setDaysWithClasses(daysActive);
    } catch {}
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  if (loading) return <ChartSkeleton />;

  const hasData = totalPeriods > 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-5">
        {/* Weekly Timetable Summary bar chart */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-600 text-zinc-100">Weekly Timetable Summary</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">Periods per day this week</p>
          </div>
          {!hasData ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-xs text-zinc-600">No timetable data yet. Assign periods to see your weekly summary.</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyLoad} barSize={28} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5% 14%)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: 'hsl(240 5% 50%)', fontSize: 11, fontFamily: 'Geist Mono' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(240 5% 50%)', fontSize: 11, fontFamily: 'Geist Mono' }}
                    axisLine={false}
                    tickLine={false}
                    width={24}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'hsl(240 5% 14% / 0.4)' }} />
                  <Bar dataKey="classes" radius={[4, 4, 0, 0]}>
                    {dailyLoad.map((entry) => (
                      <Cell
                        key={entry.day}
                        fill={entry.isToday ? 'hsl(263 70% 60%)' : 'hsl(263 70% 45%)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-violet-600" />
                  <span className="text-[10px] text-zinc-500">Classes</span>
                </div>
                <div className="ml-auto text-[10px] text-zinc-600 font-mono tabular-nums">Total: {totalPeriods} periods</div>
              </div>
            </>
          )}

          {/* Summary stats row — below the bar graph */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-zinc-800/60">
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 px-4 py-3.5 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                <FlaskConical size={15} className="text-teal-400" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Lab Sessions</p>
                <p className="text-lg font-700 text-zinc-100 tabular-nums leading-tight">{labSessions}</p>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 px-4 py-3.5 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <BookOpen size={15} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Theory Sessions</p>
                <p className="text-lg font-700 text-zinc-100 tabular-nums leading-tight">{theorySessions}</p>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 px-4 py-3.5 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                <Clock size={15} className="text-violet-400" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Class Hours/Week</p>
                <p className="text-lg font-700 text-zinc-100 tabular-nums leading-tight">{classHoursPerWeek}h</p>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 px-4 py-3.5 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <CalendarDays size={15} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Days with Classes</p>
                <p className="text-lg font-700 text-zinc-100 tabular-nums leading-tight">{daysWithClasses}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Subject distribution pie */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-600 text-zinc-100">Subject Load</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">Periods per subject this week</p>
          </div>
          {subjectDistribution.length === 0 ? (
            <div className="h-40 flex items-center justify-center">
              <p className="text-xs text-zinc-600 text-center">No subjects assigned yet.</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={subjectDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={72}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {subjectDistribution.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {subjectDistribution.map((s) => (
                  <div key={s.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.fill }} />
                      <span className="text-[10px] text-zinc-500 truncate max-w-[120px]">{s.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 tabular-nums">{s.value}p</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}