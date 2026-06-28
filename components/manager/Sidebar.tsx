'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  BellRing,
  CalendarClock,
  CircleDollarSign,
  CirclePercent,
  FileSignature,
  KeyRound,
  LayoutDashboard,
  MapPin,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { MANAGER_NAV, type ManagerNavItem } from '@/constants/navigation';
import { useAuthStore } from '@/store/useAuthStore';

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  BarChart3,
  MapPin,
  CircleDollarSign,
  CalendarClock,
  FileSignature,
  Users,
  BellRing,
  ShieldCheck,
  CirclePercent,
  KeyRound,
};

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasMemberType = useAuthStore((s) => s.hasMemberType);

  const canSee = (item: ManagerNavItem) => {
    if (item.requirePermission && !hasPermission(item.requirePermission)) return false;
    if (item.requireMemberType && !hasMemberType(item.requireMemberType)) return false;
    return true;
  };

  return (
    <nav className="flex h-full w-60 flex-col gap-6 bg-brand-black px-4 py-6 text-brand-gray-100">
      <div className="px-2">
        <Link href="/manager" className="block font-noto text-lg font-black tracking-tight text-white">
          MEDIA BUS
          <span className="ml-2 rounded-md bg-brand-blue px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
            Manager
          </span>
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {MANAGER_NAV.map((group) => {
          const items = group.items.filter(canSee);
          if (items.length === 0) return null;
          return (
            <div key={group.title}>
              <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-brand-gray-500">
                {group.title}
              </p>
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => {
                  const Icon = ICONS[item.icon];
                  const active =
                    item.href === '/manager'
                      ? pathname === '/manager'
                      : pathname === item.href ||
                        pathname?.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={
                          active
                            ? 'flex items-center gap-2.5 rounded-md bg-brand-blue/15 px-2.5 py-2 text-sm font-semibold text-white'
                            : 'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-brand-gray-300 hover:bg-white/5 hover:text-white'
                        }
                      >
                        {Icon && <Icon className="h-4 w-4" />}
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <Link
        href="/"
        className="rounded-md border border-brand-gray-700 px-3 py-2 text-center text-xs text-brand-gray-300 hover:bg-white/5"
      >
        ← 메인 사이트로
      </Link>
    </nav>
  );
}
