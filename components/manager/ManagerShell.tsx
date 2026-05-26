'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogOut, Menu, X } from 'lucide-react';
import ProtectedShell from '@/components/auth/ProtectedShell';
import Sidebar from './Sidebar';
import { useAuthStore } from '@/store/useAuthStore';
import { AuthService } from '@/lib/api/auth';
import { useRouter } from 'next/navigation';

export default function ManagerShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedShell requirePermission="MANAGE">
      <ManagerLayout>{children}</ManagerLayout>
    </ProtectedShell>
  );
}

function ManagerLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const onLogout = async () => {
    try {
      await AuthService.logout();
    } catch {
      /* ignore */
    } finally {
      logout();
      router.replace('/login');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-1px)] bg-brand-gray-50">
      <aside className="hidden md:block">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-brand-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-brand-gray-200 bg-white px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-md p-1.5 text-brand-gray-600 hover:bg-brand-gray-100 md:hidden"
              aria-label="메뉴 열기"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link href="/manager" className="text-sm font-bold text-brand-black md:hidden">
              Manager
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden text-right text-xs sm:block">
                <p className="font-semibold text-brand-black">{user.loginId}</p>
                <p className="text-brand-gray-500">
                  {user.memberType} · {user.email}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1 rounded-md border border-brand-gray-200 px-3 py-1.5 text-xs font-semibold text-brand-gray-700 hover:bg-brand-gray-100"
            >
              <LogOut className="h-3.5 w-3.5" />
              로그아웃
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
