'use client';

import { useState, useEffect } from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface EnrolledSubject {
  id: string;
  code: string;
  name: string;
  colorIndex: number;
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

export default function EnrolledSubjectsList() {
  const { user } = useAuth();
  const supabase = createClient();
  const [subjects, setSubjects] = useState<EnrolledSubject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchSubjects();
  }, [user]);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, code, name, color_index')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (!error && data) {
        setSubjects(
          data.map((s: any) => ({
            id: s.id,
            code: s.code,
            name: s.name,
            colorIndex: s.color_index || 0,
          }))
        );
      }
    } catch {}
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-zinc-800/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 py-12 flex flex-col items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center">
          <BookOpen size={20} className="text-zinc-600" />
        </div>
        <div className="text-center">
          <p className="text-sm font-500 text-zinc-300">No subjects added yet</p>
          <p className="text-xs text-zinc-600 mt-1">Go to the Subjects page to add your subjects</p>
        </div>
        <Link
          href="/subjects"
          className="mt-1 flex items-center gap-1.5 h-8 px-4 rounded-lg bg-violet-600/20 border border-violet-500/30 text-xs font-600 text-violet-300 hover:bg-violet-600/30 transition-colors"
        >
          <ExternalLink size={12} />
          Go to Subjects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">{subjects.length} subject{subjects.length !== 1 ? 's' : ''} enrolled</span>
        <Link
          href="/subjects"
          className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
        >
          <ExternalLink size={11} />
          Manage
        </Link>
      </div>
      <div className="divide-y divide-zinc-800/40 rounded-xl border border-zinc-800/60 overflow-hidden">
        {subjects.map((sub) => {
          const color = COLOR_OPTIONS[sub.colorIndex] || COLOR_OPTIONS[0];
          return (
            <div
              key={sub.id}
              className="flex items-center gap-3 px-4 py-3 bg-zinc-900/40 hover:bg-zinc-800/30 transition-colors"
            >
              <div className={`h-2.5 w-2.5 rounded-full ${color.dot} shrink-0`} />
              <span className="flex-1 text-sm font-500 text-zinc-200 truncate">{sub.name}</span>
              {sub.code && (
                <span className={`font-mono text-[10px] font-600 px-1.5 py-0.5 rounded ${color.bg} ${color.text} ${color.border} border shrink-0`}>
                  {sub.code}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
