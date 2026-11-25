'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
import { ContentService } from '@/lib/api/content';
import { extractApiError } from '@/lib/api/result-codes';
import { formatSiteDate } from '@/components/site/format';

/** 공지사항 상세: 정보 표 → 제목 → 본문(줄바꿈 유지) → 첨부 이미지 → 목록. */
export default function NoticeDetailView() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  // 상세 조회는 조회수를 올리므로 탭 전환·재연결·오류 재시도로 다시 부르지 않는다.
  const { data, error, isLoading } = useSWR(id ? ['notice-detail', id] : null, () => ContentService.notice(id as string), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  });

  const back = new URLSearchParams();
  const listPage = searchParams.get('page');
  const listKeyword = searchParams.get('q');
  const listType = searchParams.get('type');
  if (listPage && /^[1-9]\d{0,6}$/.test(listPage)) back.set('page', listPage);
  if (listKeyword) {
    back.set('q', listKeyword);
    back.set('type', listType === 'BODY' ? 'BODY' : 'TITLE');
  }
  const backQuery = back.toString();

  const backButton = (
    <Link href={backQuery ? `/support/notice?${backQuery}` : '/support/notice'} className="inline-block border border-[#ccc] px-5 py-2 text-[13px] text-[#333] hover:bg-[#f2f2f2]">
      목록
    </Link>
  );

  if (!id) return <p className="py-20 text-center text-[14px] text-[#999]">잘못된 접근입니다. {backButton}</p>;
  if (isLoading) return <p className="py-20 text-center text-[14px] text-[#999]">불러오는 중…</p>;
  if (error || !data) {
    return (
      <div className="py-20 text-center text-[14px] text-[#999]">
        <p className="mb-6">{extractApiError(error, '공지사항을 찾을 수 없습니다.')}</p>
        {backButton}
      </div>
    );
  }

  const rows: [string, string][] = [
    ['제목', data.title],
    ['작성자', '관리자'],
    ['작성일자', formatSiteDate(data.publishedAt)],
    ['조회수', data.viewCount.toLocaleString()],
  ];

  return (
    <article>
      <dl className="border-t border-[#333] text-[14px]">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[100px_1fr] border-b border-[#ddd] md:grid-cols-[200px_1fr]">
            <dt className="bg-[#f5f5f5] px-4 py-3 text-center text-[#555]">{label}</dt>
            <dd className="px-4 py-3 text-[#222]">{value}</dd>
          </div>
        ))}
      </dl>
      <h2 className="mt-10 px-2 text-[20px] text-[#222] md:text-[24px]">{data.title}</h2>
      <div className="mt-8 whitespace-pre-line break-keep px-2 text-[15px] leading-8 text-[#333]">{data.body}</div>
      {data.imageUrls.length > 0 && (
        <div className="mt-10 space-y-4 px-2">
          {data.imageUrls.map((url, index) => (
            // eslint-disable-next-line @next/next/no-img-element -- 정적 export 대상, 저장소 공개 URL
            <img key={url} src={url} alt={`${data.title} 이미지 ${index + 1}`} className="w-full max-w-[900px]" />
          ))}
        </div>
      )}
      <div className="mt-14 border-t border-[#ddd] pt-6">{backButton}</div>
    </article>
  );
}
