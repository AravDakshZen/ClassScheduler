import AppLayout from '@/components/AppLayout';
import SettingsTab from '../user-profile/components/SettingsTab';
import { Suspense } from 'react';

export default function SettingsPage() {
  return (
    <AppLayout
      pageTitle="Settings"
      pageSubtitle="Account and preferences"
    >
      <Suspense fallback={<div className="h-10 rounded-lg bg-zinc-800/40 animate-pulse" />}>
        <SettingsTab />
      </Suspense>
    </AppLayout>
  );
}
