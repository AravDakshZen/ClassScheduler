import AppLayout from '@/components/AppLayout';
import ProfileHeader from './components/ProfileHeader';
import ProfileTabs from './components/ProfileTabs';
import { Suspense } from 'react';

export default function UserProfilePage() {
  return (
    <AppLayout
      pageTitle="My Profile"
      pageSubtitle="Account details and schedule preferences"
    >
      <div className="space-y-6">
        <ProfileHeader />
        <Suspense fallback={<div className="h-10 rounded-lg bg-zinc-800/40 animate-pulse" />}>
          <ProfileTabs />
        </Suspense>
      </div>
    </AppLayout>
  );
}