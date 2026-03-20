'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import AppLogo from '@/components/ui/AppLogo';
import { CalendarDays, User, BookOpen, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';


const NAV_ITEMS = [
  {
    group: 'Schedule',
    items: [
      { label: 'Timetable', href: '/timetable-view', icon: CalendarDays },
      { label: 'Subjects', href: '/subjects', icon: BookOpen },
    ],
  },
  {
    group: 'Account',
    items: [
      { label: 'Profile', href: '/user-profile', icon: User },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

function SidebarInner({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const supabase = createClient();
  const [profileName, setProfileName] = useState<string>('');
  const [profileSub, setProfileSub] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('full_name, section, semester')
          .eq('id', user.id)
          .single();
        if (data) {
          setProfileName(data.full_name || user.email?.split('@')[0] || 'Student');
          const parts = [data.section, data.semester].filter(Boolean);
          setProfileSub(parts.join(' · ') || user.email || '');
        } else {
          setProfileName(user.email?.split('@')[0] || 'Student');
          setProfileSub(user.email || '');
        }
      } catch {
        setProfileName(user.email?.split('@')[0] || 'Student');
        setProfileSub(user.email || '');
      }
    };
    fetchProfile();
  }, [user]);

  // Determine active nav item based on current path
  const getIsActive = (href: string) => {
    return pathname === href;
  };

  const initials = profileName
    ? profileName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <aside
      className={`
        relative flex flex-col h-screen bg-zinc-950 border-r border-zinc-800/60
        transition-all duration-300 ease-in-out shrink-0
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 border-b border-zinc-800/60 px-3 ${collapsed ? 'justify-center' : 'gap-2.5 px-4'}`}>
        <AppLogo size={32} />
        {!collapsed && (
          <span className="font-display font-700 text-base text-zinc-100 tracking-tight">
            ClassScheduler
          </span>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-[4.5rem] z-10 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors duration-150"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-2 space-y-5">
        {NAV_ITEMS.map((group) => (
          <div key={group.group}>
            {!collapsed && (
              <p className="px-2 mb-1.5 text-[10px] font-600 uppercase tracking-widest text-zinc-600">
                {group.group}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = getIsActive(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className={`
                        group relative flex items-center gap-3 rounded-lg px-2.5 py-2.5
                        transition-all duration-150 text-sm font-medium
                        ${isActive
                          ? 'bg-violet-700/20 text-violet-300 border border-violet-700/30'
                          : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                        }
                        ${collapsed ? 'justify-center px-2' : ''}
                      `}
                    >
                      <Icon size={17} className={`shrink-0 ${isActive ? 'text-violet-400' : ''}`} />
                      {!collapsed && (
                        <span className="flex-1 truncate">{item.label}</span>
                      )}
                      {/* Tooltip for collapsed */}
                      {collapsed && (
                        <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-md bg-zinc-800 border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-xl">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User section at bottom — profile link only, no sign out */}
      <div className={`border-t border-zinc-800/60 p-3 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        <Link
          href="/user-profile"
          className={`
            group flex items-center gap-3 rounded-lg px-2.5 py-2.5 w-full
            hover:bg-zinc-800/60 transition-all duration-150
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <div className="relative shrink-0">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center">
              <span className="text-[10px] font-700 text-white">{initials}</span>
            </div>
            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 ring-1 ring-zinc-950" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-600 text-zinc-100 truncate">{profileName}</p>
              <p className="text-[10px] text-zinc-500 truncate">{profileSub}</p>
            </div>
          )}
          {collapsed && (
            <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-md bg-zinc-800 border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-xl">
              {profileName} — Profile
            </span>
          )}
        </Link>
      </div>
    </aside>
  );
}

export default function Sidebar(props: SidebarProps) {
  return (
    <Suspense fallback={null}>
      <SidebarInner {...props} />
    </Suspense>
  );
}