'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import {
  Zap,
  Video,
  LayoutGrid,
  CalendarDays,
  Menu,
  X,
  Megaphone,
  ClipboardCheck,
  BarChart3,
  Newspaper,
  TrendingUp,
  Mail,
  Pencil,
  Sparkles,
  BookOpen,
  Layers,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { UserBadge } from '@/contexts/auth-context';

type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Custom active check (e.g. merged routes, prefixes) */
  isActive?: (pathname: string) => boolean;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Core tools',
    items: [
      {
        name: 'Marketing Hub',
        href: '/marketing',
        icon: LayoutGrid,
        isActive: (p) => p === '/marketing' || p === '/',
      },
      { name: 'Blog Engine', href: '/blog-engine', icon: BookOpen },
      { name: 'Email Hub', href: '/email-hub', icon: Mail },
      { name: 'Content Calendar', href: '/content-calendar', icon: CalendarDays },
    ],
  },
  {
    label: 'Content creation',
    items: [
      { name: 'Ad Studio', href: '/ad-studio', icon: Pencil },
      { name: 'Ad Factory', href: '/content-engine', icon: Video },
      { name: 'Idea Bank', href: '/idea-bank', icon: Sparkles },
    ],
  },
  {
    label: 'Review & strategy',
    items: [
      {
        name: 'Ad Creative',
        href: '/ad-creative',
        icon: Layers,
        isActive: (p) =>
          p === '/ad-creative' || p === '/ad-review' || p === '/ad-concepts' || p.startsWith('/ad-review/') || p.startsWith('/ad-concepts/'),
      },
      { name: 'Growth Marketing', href: '/growth-marketing', icon: TrendingUp },
    ],
  },
  {
    label: 'Operations',
    items: [
      { name: 'Influencers', href: '/influencers', icon: Megaphone },
      { name: 'PR & Press', href: '/pr', icon: Newspaper },
      { name: 'Platform Data', href: '/platform-data', icon: BarChart3 },
    ],
  },
];

function itemIsActive(item: NavItem, pathname: string): boolean {
  if (item.isActive) return item.isActive(pathname);
  return pathname === item.href;
}

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Hide sidebar on standalone public pages
  if (pathname === '/blog-submit' || pathname.startsWith('/foods/')) return null;

  return (
    <>
      {/* Mobile header bar */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
        <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-600">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-gray-900">Signos Marketing</span>
        </div>
      </div>

      {/* Mobile backdrop */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200',
        'lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">Signos Marketing</h1>
              <p className="text-[10px] text-gray-400">Marketing Operations Hub</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 lg:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {navGroups.map((group, gi) => (
            <div
              key={group.label}
              className={cn(gi > 0 && 'mt-3 border-t border-gray-100/90 pt-3')}
            >
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = itemIsActive(item, pathname);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
                        active
                          ? 'bg-brand-500/10 font-medium text-brand-600'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                      )}
                    >
                      <item.icon className={cn('h-4 w-4 flex-shrink-0', active ? 'text-brand-500' : 'text-gray-400')} />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-gray-200 p-4">
          <UserBadge />
        </div>
      </aside>
    </>
  );
}
