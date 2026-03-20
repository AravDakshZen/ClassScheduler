import AppLogo from '@/components/ui/AppLogo';
import { CalendarDays, Clock, BookOpen, Users } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const FEATURES = [
{ icon: CalendarDays, text: 'Full weekly timetable at a glance' },
{ icon: Clock, text: 'Real-time next class countdown' },
{ icon: BookOpen, text: 'Subject-wise schedule with teacher info' },
{ icon: Users, text: 'Section-specific schedules for your batch' }];


export default function BrandPanel() {
  return (
    <div className="relative w-full bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border-r border-zinc-800/60 flex flex-col justify-between p-12 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-violet-700/10 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-indigo-700/10 blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      {/* Logo */}
      <div className="flex items-center gap-3 relative">
        <AppLogo size={40} />
        <span className="font-display text-xl font-700 text-zinc-100 tracking-tight">ClassScheduler</span>
      </div>
      {/* Main content */}
      <div className="relative space-y-8">
        {/* Timetable illustration — SVG grid */}
        <div className="rounded-2xl border border-zinc-700/40 bg-zinc-900/60 p-5 backdrop-blur-sm shadow-2xl shadow-black/40">
          {/* Mini timetable preview */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-600 text-zinc-400">Weekly Schedule : CS-6B</span>
            <span className="font-mono text-[10px] text-zinc-600">Mar 2026</span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']?.map((d, i) =>
            <div key={d} className="text-center">
                <p className={`text-[9px] font-600 mb-1 ${i === 0 ? 'text-violet-400' : 'text-zinc-600'}`}>{d}</p>
                {[...Array(5)]?.map((_, j) =>
              <div
                key={j}
                className={`h-5 rounded-sm mb-0.5 ${
                Math.random() > 0.25 ?
                ['bg-violet-500/30', 'bg-indigo-500/30', 'bg-sky-500/30', 'bg-emerald-500/30', 'bg-amber-500/30', 'bg-teal-500/30']?.[Math.floor(Math.random() * 6)] :
                'bg-zinc-800/40'} ${
                i === 0 ? 'ring-1 ring-violet-500/20' : ''}`} />

              )}
              </div>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-800 text-zinc-100 leading-tight tracking-tight">
            Never miss a class<br />
            <span className="text-violet-400">again.</span>
          </h1>
          <p className="mt-3 text-sm text-zinc-500 leading-relaxed">Your complete college timetable in one place - with teacher details, room numbers, and real-time class status.

          </p>
        </div>

        <ul className="space-y-3">
          {FEATURES?.map((f) => {
            const Icon = f?.icon;
            return (
              <li key={f?.text} className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 border border-violet-500/25">
                  <Icon size={14} className="text-violet-400" />
                </div>
                <span className="text-sm text-zinc-400">{f?.text}</span>
              </li>);

          })}
        </ul>
      </div>
      {/* Footer */}
      <div className="relative">
        <p className="text-xs text-zinc-700">© 2026 ClassScheduler · All rights reserved.

        </p>
      </div>
    </div>);

}