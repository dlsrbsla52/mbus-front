'use client';

import { useState } from 'react';
import { PARTNERS, type Partner } from '@/constants/site';

const PartnerLabel = ({ label }: { label: string }) => (
  <span className="whitespace-pre-line break-keep text-center text-[11.5px] font-extrabold leading-tight tracking-tight text-[#12395f]">
    {label}
  </span>
);

/** 로고를 불러오지 못하면 기존 사이트처럼 이름 카드로 바꾼다. */
function PartnerCard({ partner }: { partner: Partner }) {
  const [broken, setBroken] = useState(false);
  const showLogo = partner.logo && !broken;

  return (
    <div
      className={`flex h-[62px] items-center justify-center rounded-lg bg-white px-2 transition duration-200 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(79,195,247,0.35)] md:h-[74px] ${
        partner.stacked ? 'flex-col' : ''
      }`}
    >
      {showLogo ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- 정적 export 대상 */}
          <img
            src={partner.logo ?? undefined}
            alt={partner.name}
            className={`max-w-full object-contain ${partner.stacked ? 'max-h-[38px]' : 'max-h-full'}`}
            onError={() => setBroken(true)}
            loading="lazy"
          />
          {partner.stacked && <PartnerLabel label={partner.label} />}
        </>
      ) : (
        <PartnerLabel label={partner.label} />
      )}
    </div>
  );
}

/** "이미 서울버스TV와 함께한 의료기관" 파트너 로고 그리드. */
export default function PartnersSection() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(1200px_520px_at_15%_0%,rgba(43,88,150,0.55)_0%,transparent_62%),radial-gradient(900px_520px_at_88%_100%,rgba(24,64,120,0.45)_0%,transparent_62%),linear-gradient(135deg,#0b1524_0%,#132a45_45%,#0d1c30_100%)] px-4 pb-14 pt-[74px] md:px-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 origin-top-left -skew-y-6 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[length:64px_64px]"
      />
      <div className="relative mx-auto max-w-[1560px]">
        <div className="mb-7 text-center">
          <p className="mb-2.5 text-[12px] font-bold tracking-[3px] text-site-sky">MEDIABUS PARTNERS</p>
          <h2 className="text-[20px] font-extrabold tracking-tight text-white md:text-[30px]">
            이미 <span className="text-[#4fc3f7]">서울버스TV</span>와 함께한 의료기관
          </h2>
          <p className="mt-2 text-[14px] font-light text-white/60">930만 서울 시민의 하루, 그 안에서 브랜드를 알린 파트너들입니다</p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-7 md:gap-2.5 lg:grid-cols-9 xl:grid-cols-11">
          {PARTNERS.map((partner) => (
            <PartnerCard key={partner.name} partner={partner} />
          ))}
        </div>
      </div>
    </section>
  );
}
