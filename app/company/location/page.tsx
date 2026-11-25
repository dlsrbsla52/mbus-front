import type { Metadata } from 'next';
import SubPageLayout from '@/components/site/SubPageLayout';
import { COMPANY_INFO } from '@/constants/site';

export const metadata: Metadata = { title: '오시는 길 ｜ 미디어버스' };

/** 기존 사이트가 쓰던 Google 지도 임베드(키 불필요). */
const MAP_EMBED_URL =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3165.119337672217!2d127.04570967719931!3d37.5051034276462!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x357ca40fa1d84dd3%3A0x249113d51a6e3047!2z7ISc7Jq47Yq567OE7IucIOqwleuCqOq1rCDsl63sgrzrj5kgNzA1LTIy!5e0!3m2!1sko!2skr!4v1767877226979!5m2!1sko!2skr';

export default function LocationPage() {
  return (
    <SubPageLayout section="company" current="/company/location">
      <div className="grid gap-10 lg:grid-cols-[1fr_520px] lg:gap-16">
        <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-[#f2f2f2] lg:aspect-auto lg:min-h-[600px]">
          <iframe
            src={MAP_EMBED_URL}
            title="미디어버스 위치 지도"
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>

        <div>
          <h2 className="text-[22px] font-medium text-[#111]">Head Office</h2>
          {/* eslint-disable-next-line @next/next/no-img-element -- 정적 export 대상 */}
          <img src="/images/site/location-map.webp" alt="" className="mt-4 w-full rounded-md" />

          <dl className="mt-8 space-y-5 px-2 text-[16px] text-[#333]">
            <div>
              <dt className="text-[13px] font-bold text-[#111]">주소</dt>
              <dd className="mt-1">
                ({COMPANY_INFO.postalCode}) {COMPANY_INFO.address}
              </dd>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <dt className="text-[13px] font-bold text-[#111]">전화</dt>
              <dd>
                <a href={`tel:${COMPANY_INFO.tel}`}>{COMPANY_INFO.tel}</a>
              </dd>
              <span className="text-[#ccc]">/</span>
              <dt className="text-[13px] font-bold text-[#111]">팩스</dt>
              <dd>{COMPANY_INFO.fax}</dd>
            </div>
            <div>
              <dt className="sr-only">이메일</dt>
              <dd>
                <a href={`mailto:${COMPANY_INFO.email}`}>{COMPANY_INFO.email}</a>
              </dd>
            </div>
          </dl>

          <p className="mt-10 rounded-md bg-[#f2f2f2] px-6 py-5 text-center text-[15px] text-[#333]">
            ※ {COMPANY_INFO.directions}
          </p>
        </div>
      </div>
    </SubPageLayout>
  );
}
