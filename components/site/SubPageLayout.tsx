import React from 'react';
import Link from 'next/link';
import { SITE_MENU, type SiteMenuChild } from '@/constants/navigation';
import SiteSWRConfig from '@/components/site/SiteSWRConfig';
import { SUB_VISUALS, SUB_VISUAL_CAPTION } from '@/constants/site';

interface SubPageLayoutProps {
  /** `SUB_VISUALS` 키 (company·media·portfolio·inquiry·support·privacy) */
  section: keyof typeof SUB_VISUALS;
  /** 현재 하위 메뉴 경로. 탭 강조에 쓴다. */
  current: string;
  /** 메뉴에 없는 페이지(개인정보처리방침 등)의 탭 */
  tabs?: SiteMenuChild[];
  /** 본문 여백을 쓰지 않는 페이지 */
  bare?: boolean;
  children: React.ReactNode;
}

/** 공개 서브 페이지 공통 틀: 서브 비주얼 → 하위 메뉴 탭 → 본문. 기존 mbus.co.kr 서브 페이지 구조와 같다. */
export default function SubPageLayout({ section, current, tabs, bare = false, children }: SubPageLayoutProps) {
  const visual = SUB_VISUALS[section];
  const menuTabs = tabs ?? SITE_MENU.find((item) => item.href.split('/')[1] === section)?.children ?? [];

  return (
    <SiteSWRConfig>
      <section
        className="relative h-[240px] overflow-hidden bg-cover bg-center md:h-[370px]"
        style={{ backgroundImage: `url(${visual.image})` }}
      >
        <div className="absolute inset-0 bg-black/15" />
        <div className="relative mx-auto max-w-[1430px] px-[15px] pt-[110px] text-center text-white md:pt-[180px]">
          <h1 className="text-[28px] font-semibold tracking-tight md:text-[40px]">{visual.title}</h1>
          <p className="mt-3 text-[14px] md:mt-4 md:text-[17px]">{SUB_VISUAL_CAPTION}</p>
        </div>
      </section>

      <nav className="border-b border-[#dedede] bg-white" aria-label="하위 메뉴">
        <ul className="mx-auto flex max-w-[1430px] justify-center px-[15px]">
          {menuTabs.map((tab) => {
            const active = tab.href === current;
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative block px-5 py-4 text-[15px] md:px-[38px] md:py-5 md:text-[16px] ${
                    active ? 'font-bold text-[#111]' : 'text-[#666] hover:text-[#111]'
                  }`}
                >
                  {tab.label}
                  {active && <span className="absolute inset-x-3 -bottom-px h-[2px] bg-site-navy md:inset-x-6" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {bare ? (
        children
      ) : (
        <div className="mx-auto max-w-[1430px] px-[15px] pb-20 pt-12 md:pb-[150px] md:pt-[130px]">{children}</div>
      )}
    </SiteSWRConfig>
  );
}
