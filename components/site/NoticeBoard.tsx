'use client';

import { useRef } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ContentService } from '@/lib/api/content';
import type { NoticeSearchType } from '@/lib/api/content-model';
import { extractApiError } from '@/lib/api/result-codes';
import { useBoardQuery } from '@/components/site/board/useBoardQuery';
import BoardPagination from '@/components/site/board/BoardPagination';
import BoardSearch from '@/components/site/board/BoardSearch';
import { formatSiteDate } from '@/components/site/format';

const PAGE_SIZE = 10;
const AUTHOR = '관리자';

/** 공지사항 목록: 번호(고정 글은 "공지") · 제목 · 작성자 · 작성일자 · 조회수. */
export default function NoticeBoard() {
  const { get, page, update } = useBoardQuery();
  const boardRef = useRef<HTMLDivElement>(null);
  const keyword = get('q');
  const searchType: NoticeSearchType = get('type') === 'BODY' ? 'BODY' : 'TITLE';

  // 새 페이지를 받는 동안 이전 목록을 유지해 표 높이가 줄었다 늘며 화면이 튀지 않게 한다.
  const { data, error, isLoading, isValidating } = useSWR(
    ['notices', keyword, searchType, page],
    () => ContentService.notices({ keyword, searchType, page, size: PAGE_SIZE }),
    { keepPreviousData: true },
  );
  const refreshing = isValidating && !!data;
  const go = (patch: Record<string, string | number | undefined>) => update(patch, { reveal: boardRef.current });

  const listState = new URLSearchParams();
  if (page > 0) listState.set('page', String(page));
  if (keyword) {
    listState.set('q', keyword);
    listState.set('type', searchType);
  }

  const th = 'px-2 py-4 text-[13px] font-medium text-[#555]';
  const td = 'px-2 py-4 text-[14px] text-[#555]';

  return (
    <div ref={boardRef} className="[overflow-anchor:none]">
      <table aria-busy={refreshing} className={`w-full border-t border-[#333] text-center transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
        <thead className="border-b border-[#ddd]">
          <tr>
            <th className={`${th} w-16`}>번호</th>
            <th className={th}>제목</th>
            <th className={`${th} hidden w-24 md:table-cell`}>작성자</th>
            <th className={`${th} w-28`}>작성일자</th>
            <th className={`${th} hidden w-20 md:table-cell`}>조회수</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#ddd] border-b border-[#ddd]">
          {isLoading && !data && (
            <tr>
              <td colSpan={5} className="py-14 text-[14px] text-[#999]">
                불러오는 중…
              </td>
            </tr>
          )}
          {error && (
            <tr>
              <td colSpan={5} className="py-14 text-[14px] text-[#999]">
                {extractApiError(error, '공지사항을 불러오지 못했습니다.')}
              </td>
            </tr>
          )}
          {data && data.content.length === 0 && (
            <tr>
              <td colSpan={5} className="py-14 text-[14px] text-[#999]">
                등록된 공지사항이 없습니다.
              </td>
            </tr>
          )}
          {data?.content.map((notice, index) => (
            <tr key={notice.id} className="hover:bg-[#fafafa]">
              <td className={td}>{notice.pinned ? <strong className="text-[#111]">공지</strong> : data.totalElements - page * PAGE_SIZE - index}</td>
              <td className={`${td} text-left`}>
                <Link href={`/support/notice/detail?${new URLSearchParams({ id: notice.id, ...Object.fromEntries(listState) })}`} className="line-clamp-1 text-[#333] hover:text-site-navy hover:underline">
                  {notice.title}
                </Link>
              </td>
              <td className={`${td} hidden md:table-cell`}>{AUTHOR}</td>
              <td className={td}>{formatSiteDate(notice.publishedAt)}</td>
              <td className={`${td} hidden md:table-cell`}>{notice.viewCount.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <BoardPagination page={page} totalPages={data?.totalPages ?? 0} onChange={(p) => go({ page: p })} />
      <BoardSearch<NoticeSearchType>
        options={[
          { value: 'TITLE', label: '제목' },
          { value: 'BODY', label: '내용' },
        ]}
        key={`${searchType}:${keyword ?? ''}`}
        initialField={searchType}
        initialKeyword={keyword}
        onSearch={(type, q) => go({ q, type: q ? type : undefined, page: 0 })}
      />
    </div>
  );
}
