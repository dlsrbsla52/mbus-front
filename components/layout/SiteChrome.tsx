'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

const FULL_BLEED_PREFIXES = ['/manager'];

/** 헤더가 비주얼 위에 투명하게 겹치는 공개 페이지. 나머지 페이지는 헤더 높이만큼 본문을 내린다. */
const OVERLAY_PREFIXES = ['/company', '/media', '/portfolio', '/inquiry', '/support', '/privacy'];

const matches = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';

  if (FULL_BLEED_PREFIXES.some((p) => matches(pathname, p))) {
    return <>{children}</>;
  }

  const overlay = pathname === '/' || OVERLAY_PREFIXES.some((p) => matches(pathname, p));

  return (
    <>
      <Header overlay={overlay} />
      <main className={`flex-grow${overlay ? '' : ' pt-[70px] lg:pt-[90px]'}`}>{children}</main>
      <Footer />
    </>
  );
}
