import React from "react";
import Link from "next/link";
import { ChevronUp } from "lucide-react";
import { SITE_MENU } from "@/constants/navigation";
import { COMPANY_INFO, FAMILY_SITES, SNS_LINKS } from "@/constants/site";

const Divider = () => <span className="mx-2 text-white/20">/</span>;

/** 공개 사이트 푸터. 기존 mbus.co.kr 푸터(메뉴 · 회사 정보 · SNS · 관련 사이트)를 재현한다. */
const Footer = () => {
  const snsLinks = SNS_LINKS.filter((sns) => sns.href);

  return (
    <footer className="bg-[#111111] pb-14 pt-12 text-[13px] text-[#999] lg:pt-[60px]">
      <div className="mx-auto max-w-[1430px] px-[15px]">
        <nav className="flex flex-wrap gap-x-10 gap-y-3" aria-label="푸터 메뉴">
          {SITE_MENU.map((item) => (
            <Link key={item.href} href={item.href} className="text-[14px] font-medium text-white hover:text-[#6fc8ff]">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <address className="space-y-2 not-italic leading-relaxed">
            <p>
              ({COMPANY_INFO.postalCode}) {COMPANY_INFO.address} {COMPANY_INFO.tagline}
              <Divider />
              전화 : {COMPANY_INFO.tel}
              <Divider />
              팩스 : {COMPANY_INFO.fax}
              <Divider />
              사업자등록번호 : {COMPANY_INFO.businessNumber}
            </p>
            <p>
              대표 : {COMPANY_INFO.ceo}
              <Divider />
              개인정보관리책임자 : {COMPANY_INFO.privacyOfficer}
              <Divider />
              <a href={`mailto:${COMPANY_INFO.email}`} className="hover:text-white">
                {COMPANY_INFO.email}
              </a>
              <Divider />
              <Link href="/privacy" className="hover:text-white">
                개인정보처리방침
              </Link>
            </p>
            <p>© MEDIABUS. All Rights Reserved.</p>
          </address>

          <div className="flex flex-col items-start gap-4 lg:items-end">
            {snsLinks.length > 0 && (
              <div className="flex items-center gap-3">
                {snsLinks.map((sns) => (
                  <a key={sns.label} href={sns.href ?? undefined} target="_blank" rel="noreferrer" aria-label={sns.label}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- 정적 아이콘 */}
                    <img src={sns.icon} alt="" className="h-[22px] w-auto opacity-80 hover:opacity-100" />
                  </a>
                ))}
              </div>
            )}
            <details className="group relative">
              <summary className="flex w-[200px] cursor-pointer list-none items-center justify-between border border-white/30 px-4 py-2 text-[12px] text-white/80 hover:text-white">
                관련 사이트 바로 가기
                <ChevronUp size={14} className="transition-transform group-open:rotate-180" />
              </summary>
              <ul className="absolute bottom-full left-0 mb-1 w-[200px] border border-white/20 bg-[#1b1b1b] py-1">
                {FAMILY_SITES.map((site) => (
                  <li key={site.href}>
                    <a
                      href={site.href}
                      target="_blank"
                      rel="noreferrer"
                      className="block px-4 py-2 text-[12px] text-white/70 hover:bg-white/10 hover:text-white"
                    >
                      {site.label}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
