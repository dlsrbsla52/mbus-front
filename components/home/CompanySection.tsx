import Link from 'next/link';
import { HOME_TILES } from '@/constants/site';

/** "Beyond Expectations" 회사 소개와 주요 메뉴 바로가기 타일. */
export default function CompanySection() {
  return (
    <section className="bg-white py-20 md:py-[130px]">
      <div className="mx-auto flex max-w-[1430px] flex-col gap-12 px-[15px] lg:flex-row lg:items-center lg:gap-16">
        <div className="lg:w-[38%]">
          <p className="text-[14px] font-medium text-site-navy md:text-[16px]">Beyond Expectations</p>
          <h3 className="mt-2 text-[26px] font-bold text-[#111] md:text-[32px]">Company</h3>
          <h2 className="mt-4 text-[17px] text-[#333] md:text-[20px]">Designing Tomorrow&apos;s Web Today</h2>
          <p className="mt-8 text-[15px] leading-relaxed text-[#555] md:mt-14 md:text-[17px]">
            미래에 대한 비전을 고객과 공유하며
            <br />
            함께 성장하는 협력 기업
          </p>
          <Link href="/company" className="mt-10 inline-block transition-transform hover:translate-x-2" aria-label="회사소개 바로가기">
            {/* eslint-disable-next-line @next/next/no-img-element -- 정적 아이콘 */}
            <img src="/images/site/icon-arrow-long.png" alt="" className="h-8 w-auto" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-5 lg:flex-1">
          {HOME_TILES.map((tile) => (
            <Link key={tile.href} href={tile.href} className="group relative block aspect-[1.55/1] overflow-hidden rounded-lg">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url(${tile.image})` }}
              />
              <div className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/45" />
              <span className="absolute bottom-4 right-4 flex items-center gap-2 text-[15px] font-bold text-white md:bottom-6 md:right-6 md:text-[18px]">
                {tile.label}
                {/* eslint-disable-next-line @next/next/no-img-element -- 정적 아이콘 */}
                <img src="/images/site/icon-arrow-up-right.png" alt="" className="h-4 w-4 md:h-5 md:w-5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
