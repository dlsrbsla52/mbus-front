'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

const FULL_BLEED_PREFIXES = ['/manager'];

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const isFullBleed = FULL_BLEED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isFullBleed) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="flex-grow">{children}</main>
      <Footer />
    </>
  );
}
