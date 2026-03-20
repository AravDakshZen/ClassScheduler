'use client';

import AppLayout from '@/components/AppLayout';
import TimetableGrid from './components/TimetableGrid';
import TodaySchedule from './components/TodaySchedule';
import TimetableStats from './components/TimetableStats';
import WeeklyChart from './components/WeeklyChart';
import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PERIODS = [
  { num: 1, time: '08:00–09:00' },
  { num: 2, time: '09:00–10:00' },
  { num: 3, time: '10:00–11:00' },
  { num: 4, time: '11:00–12:00' },
  { num: 5, time: '12:00–13:00' },
  { num: 6, time: '13:00–14:00' },
  { num: 7, time: '14:00–15:00' },
  { num: 8, time: '15:00–16:00' },
  { num: 9, time: '16:00–17:00' },
];

export default function TimetableViewPage() {
  const [exporting, setExporting] = useState(false);
  const { user } = useAuth();
  const supabase = createClient();

  const handleExportPDF = async () => {
    if (!user) { toast.error('Please sign in to export.'); return; }
    setExporting(true);
    try {
      // Fetch data fresh for PDF
      const [subjectsRes, entriesRes] = await Promise.all([
        supabase.from('subjects').select('*').eq('user_id', user.id),
        supabase.from('timetable_entries').select('*').eq('user_id', user.id),
      ]);

      const subjects: Record<string, any> = {};
      (subjectsRes.data || []).forEach((s: any) => { subjects[s.id] = s; });

      // Build schedule map
      const schedule: Record<string, Record<number, any>> = {};
      DAYS.forEach((d) => { schedule[d] = {}; });
      (entriesRes.data || []).forEach((e: any) => {
        if (e.day_of_week && e.period_number && subjects[e.subject_id]) {
          schedule[e.day_of_week][e.period_number] = { ...subjects[e.subject_id], venue: e.venue || '' };
        }
      });

      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;

      // White background
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageW, pageH, 'F');

      // Title
      pdf.setFontSize(14);
      pdf.setTextColor(30, 30, 30);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Weekly Timetable', margin, margin + 6);

      const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Generated: ${dateStr}`, margin, margin + 12);

      // Table dimensions
      const tableTop = margin + 18;
      const colPeriod = 22;
      const colDay = (pageW - margin * 2 - colPeriod) / DAYS.length;
      const rowH = (pageH - tableTop - margin) / (PERIODS.length + 1); // +1 for header

      // Draw header row
      pdf.setFillColor(245, 245, 250);
      pdf.rect(margin, tableTop, pageW - margin * 2, rowH, 'F');

      // Header borders
      pdf.setDrawColor(200, 200, 210);
      pdf.setLineWidth(0.3);
      pdf.rect(margin, tableTop, pageW - margin * 2, rowH);

      // "Period" header
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(80, 80, 100);
      pdf.text('PERIOD', margin + 2, tableTop + rowH / 2 + 2);

      // Day headers
      DAYS.forEach((day, i) => {
        const x = margin + colPeriod + i * colDay;
        pdf.setFillColor(245, 245, 250);
        pdf.rect(x, tableTop, colDay, rowH, 'F');
        pdf.setDrawColor(200, 200, 210);
        pdf.rect(x, tableTop, colDay, rowH);
        pdf.setFontSize(7.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(60, 60, 80);
        const label = DAY_SHORT[i];
        const tw = pdf.getTextWidth(label);
        pdf.text(label, x + colDay / 2 - tw / 2, tableTop + rowH / 2 + 2.5);
      });

      // Period rows
      PERIODS.forEach((period, pi) => {
        const rowY = tableTop + rowH * (pi + 1);

        // Period label cell
        pdf.setFillColor(250, 250, 252);
        pdf.rect(margin, rowY, colPeriod, rowH, 'F');
        pdf.setDrawColor(200, 200, 210);
        pdf.rect(margin, rowY, colPeriod, rowH);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(60, 60, 80);
        pdf.text(`P${period.num}`, margin + 2, rowY + 4);
        pdf.setFontSize(5.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(130, 130, 150);
        pdf.text(period.time, margin + 2, rowY + 8.5);

        // Day cells
        DAYS.forEach((day, di) => {
          const cellX = margin + colPeriod + di * colDay;
          const entry = schedule[day]?.[period.num];

          pdf.setDrawColor(200, 200, 210);
          pdf.setLineWidth(0.2);

          if (entry) {
            // Colored background based on color_index
            const colorPalette = [
              [237, 233, 254], // violet
              [224, 231, 255], // indigo
              [224, 242, 254], // sky
              [209, 250, 229], // emerald
              [254, 243, 199], // amber
              [254, 226, 226], // rose
              [204, 251, 241], // teal
              [255, 237, 213], // orange
            ];
            const textPalette = [
              [109, 40, 217],
              [67, 56, 202],
              [2, 132, 199],
              [5, 150, 105],
              [180, 83, 9],
              [185, 28, 28],
              [13, 148, 136],
              [194, 65, 12],
            ];
            const ci = (entry.color_index || 0) % colorPalette.length;
            const [r, g, b] = colorPalette[ci];
            const [tr, tg, tb] = textPalette[ci];

            pdf.setFillColor(r, g, b);
            pdf.rect(cellX + 0.5, rowY + 0.5, colDay - 1, rowH - 1, 'F');
            pdf.setDrawColor(tr, tg, tb);
            pdf.setLineWidth(0.4);
            pdf.rect(cellX + 0.5, rowY + 0.5, colDay - 1, rowH - 1);

            // Subject name
            pdf.setFontSize(6.5);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(tr, tg, tb);
            const nameLines = pdf.splitTextToSize(entry.name || '', colDay - 3);
            pdf.text(nameLines.slice(0, 2), cellX + 1.5, rowY + 4.5);

            // Code
            pdf.setFontSize(5.5);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(100, 100, 120);
            pdf.text(entry.code || '', cellX + 1.5, rowY + 4.5 + (nameLines.slice(0, 2).length * 3.5));

            // Teacher
            if (entry.teacher) {
              pdf.setFontSize(5.5);
              pdf.setFont('helvetica', 'bold');
              pdf.setTextColor(50, 50, 70);
              const teacherY = rowY + 4.5 + (nameLines.slice(0, 2).length * 3.5) + 3.5;
              const teacherLines = pdf.splitTextToSize(entry.teacher, colDay - 3);
              pdf.text(teacherLines.slice(0, 1), cellX + 1.5, teacherY);
            }

            // Venue
            const displayVenue = entry.venue || entry.room || '';
            if (displayVenue) {
              pdf.setFontSize(5);
              pdf.setFont('helvetica', 'normal');
              pdf.setTextColor(80, 80, 100);
              pdf.text(`⬡ ${displayVenue}`, cellX + 1.5, rowY + rowH - 2.5);
            }
          } else {
            // Empty cell
            pdf.setFillColor(252, 252, 254);
            pdf.rect(cellX, rowY, colDay, rowH, 'F');
            pdf.setDrawColor(210, 210, 220);
            pdf.setLineWidth(0.2);
            pdf.rect(cellX, rowY, colDay, rowH);
          }
        });
      });

      // Footer
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(160, 160, 180);
      pdf.text('ClassScheduler — Your Personal Timetable', margin, pageH - 4);

      pdf.save(`timetable-${dateStr.replace(/ /g, '-')}.pdf`);
      toast.success('Timetable exported as PDF!');
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error('PDF export failed. Please try again.');
    }
    setExporting(false);
  };

  return (
    <AppLayout
      pageTitle="Timetable"
      pageSubtitle="Your personal class schedule"
    >
      <Toaster position="bottom-right" theme="dark" richColors />
      <div className="space-y-6">
        {/* Stats row */}
        <TimetableStats />

        {/* Export PDF button */}
        <div className="flex justify-end">
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-sm font-500 text-zinc-300 hover:bg-zinc-700/60 hover:text-zinc-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Exporting…</span>
              </>
            ) : (
              <>
                <Download size={14} />
                <span>Export PDF</span>
              </>
            )}
          </button>
        </div>

        {/* Main content: grid + today sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-4 2xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 2xl:col-span-3">
            <TimetableGrid />
          </div>
          <div className="xl:col-span-1 2xl:col-span-1">
            <TodaySchedule />
          </div>
        </div>

        {/* Weekly chart */}
        <WeeklyChart />
      </div>
    </AppLayout>
  );
}