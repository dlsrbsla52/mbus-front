'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowUpRight, Phone } from 'lucide-react';
import { ContentService } from '@/lib/api/content';
import { COMPANY_INFO } from '@/constants/site';
import { formatSiteDate } from '@/components/site/format';

/** 홈 하단: 최근 공지 5건 · 온라인 문의 · 고객센터. */
export default function CustomerSection() {
  const { data, error, isLoading } = useSWR(['home-notices'], () => ContentService.notices({ page: 0, size: 5 }));
  const notices = data?.content ?? [];

  return (
    <section className="bg-[#f2f2f2] py-16 md:py-[100px]">
      <div className="mx-auto grid max-w-[1430px] gap-10 px-[15px] lg:grid-cols-[1.6fr_1fr_1fr] lg:gap-0">
        <div className="lg:pr-12">
          <div className="flex items-end justify-between border-b border-[#333] pb-4">
            <h2 className="text-[28px] font-bold text-[#111] md:text-[34px]">NEWS</h2>
            <Link href="/support/notice" className="text-[12px] font-medium text-[#666] hover:text-[#111]">
              + MORE
            </Link>
          </div>
          <ul className="divide-y divide-[#ddd]">
            {isLoading && <li className="py-4 text-[14px] text-[#999]">불러오는 중…</li>}
            {error && <li className="py-4 text-[14px] text-[#999]">공지사항을 불러오지 못했습니다.</li>}
            {!isLoading && !error && notices.length === 0 && (
              <li className="py-4 text-[14px] text-[#999]">등록된 공지사항이 없습니다.</li>
            )}
            {notices.map((notice) => (
              <li key={notice.id}>
                <Link
                  href={`/support/notice/detail?id=${notice.id}`}
                  className="flex items-center justify-between gap-4 py-3.5 text-[14px] text-[#333] hover:text-site-navy"
                >
                  <span className="truncate">{notice.title}</span>
                  <span className="shrink-0 text-[13px] text-[#888]">{formatSiteDate(notice.publishedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <Link
          href="/inquiry"
          className="group flex flex-col justify-between border-[#ddd] bg-white p-8 transition-colors hover:bg-site-navy lg:border-l"
        >
          <div>
            <p className="text-[12px] text-site-navy group-hover:text-white/70">온라인 문의</p>
            <h3 className="mt-1 text-[28px] font-bold text-[#111] group-hover:text-white">Q&amp;A</h3>
            <p className="mt-6 text-[14px] leading-relaxed text-[#666] group-hover:text-white/80">
              궁금한 사항을,
              <br />
              신속히 도와드립니다
            </p>
          </div>
          <ArrowUpRight className="mt-8 self-end text-[#333] group-hover:text-white" size={22} />
        </Link>

        <div className="flex flex-col justify-between bg-white p-8 lg:border-l lg:border-[#ddd]">
          <div>
            <Phone className="text-site-navy" size={26} />
            <h3 className="mt-3 text-[24px] font-bold leading-tight text-[#111]">
              Customer
              <br />
              Center
            </h3>
            <a href={`tel:${COMPANY_INFO.tel}`} className="mt-4 block text-[26px] font-bold text-[#111]">
              {COMPANY_INFO.tel}
            </a>
            <ul className="mt-3 space-y-1 text-[13px] text-[#666]">
              {COMPANY_INFO.hours.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <Link
            href="/company/location"
            className="mt-8 inline-flex w-fit items-center gap-2 rounded bg-site-navy px-5 py-3 text-[14px] font-bold text-white hover:bg-[#0f3360]"
          >
            오시는 길 <span className="text-[11px] font-normal text-white/70">Location</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
