import AppLayout from '@/components/AppLayout';
import SubjectsManager from './components/SubjectsManager';

export default function SubjectsPage() {
  return (
    <AppLayout
      pageTitle="Subjects"
      pageSubtitle="Manage your enrolled subjects and their details"
    >
      <SubjectsManager />
    </AppLayout>
  );
}
