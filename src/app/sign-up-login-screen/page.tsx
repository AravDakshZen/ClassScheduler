import { Suspense } from 'react';
import LoginForm from './components/LoginForm';
import BrandPanel from './components/BrandPanel';
import { Loader2 } from 'lucide-react';

export default function SignUpLoginPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Left brand panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%]">
        <BrandPanel />
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-zinc-950 relative">
        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/20 via-transparent to-transparent pointer-events-none" />
        <Suspense fallback={
          <div className="flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-violet-400" />
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}