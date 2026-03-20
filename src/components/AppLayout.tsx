'use client';

import { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import { Menu, Search, X } from 'lucide-react';

import AppLogo from '@/components/ui/AppLogo';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface AppLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
}

export default function AppLayout({ children, pageTitle, pageSubtitle }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const [initials, setInitials] = useState('U');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetchInitials = async () => {
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        const name = data?.full_name || user.email?.split('@')[0] || 'U';
        setInitials(
          name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        );
      } catch {
        const name = user.email?.split('@')[0] || 'U';
        setInitials(name.slice(0, 2).toUpperCase());
      }
    };
    fetchInitials();
  }, [user]);

  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  const SEARCH_LINKS = [
    { label: 'Timetable', href: '/timetable-view', keywords: ['timetable', 'schedule', 'class', 'period'] },
    { label: 'Subjects', href: '/subjects', keywords: ['subject', 'course', 'add subject'] },
    { label: 'Profile', href: '/user-profile', keywords: ['profile', 'account', 'me', 'student'] },
    { label: 'Settings', href: '/settings', keywords: ['settings', 'preferences', 'notification', 'display', 'sign out', 'logout'] },
  ];

  const filteredLinks = searchQuery.trim()
    ? SEARCH_LINKS.filter((l) =>
        l.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.keywords.some((k) => k.includes(searchQuery.toLowerCase()))
      )
    : SEARCH_LINKS;

  const handleSearchSelect = (href: string) => {
    router.push(href);
    setSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-60 h-full">
            <Sidebar collapsed={false} onToggle={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setSearchOpen(false); setSearchQuery(''); }} />
          <div className="relative w-full max-w-md rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl shadow-black/60 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
              <Search size={15} className="text-zinc-500 shrink-0" />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages…"
                className="flex-1 bg-transparent text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none"
                onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); } }}
              />
              <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="p-2">
              {filteredLinks.length === 0 ? (
                <p className="text-xs text-zinc-600 px-3 py-4 text-center">No results found</p>
              ) : (
                filteredLinks.map((link) => (
                  <button
                    key={link.href + link.label}
                    onClick={() => handleSearchSelect(link.href)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/60 transition-colors text-left"
                  >
                    <span className="text-sm text-zinc-300">{link.label}</span>
                    <span className="text-[10px] text-zinc-600 ml-auto font-mono">{link.href}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex items-center gap-4 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm px-4 lg:px-6 shrink-0">
          {/* Mobile hamburger */}
          <button
            className="lg:hidden flex items-center justify-center h-9 w-9 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-zinc-100 transition-colors"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2">
            <AppLogo size={28} />
            <span className="font-display font-semibold text-sm text-zinc-100">ClassScheduler</span>
          </div>

          {/* Page title (desktop) */}
          <div className="hidden lg:block">
            {pageTitle && (
              <div>
                <h1 className="text-lg font-semibold text-zinc-100 leading-tight">{pageTitle}</h1>
                {pageSubtitle && <p className="text-xs text-zinc-500">{pageSubtitle}</p>}
              </div>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center h-9 w-9 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-zinc-100 transition-colors"
              aria-label="Search"
            >
              <Search size={16} />
            </button>
          </div>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 2xl:px-10 py-4 sm:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}