'use client';

import { useRef } from 'react';
import useSWR from 'swr';
import { ContentService } from '@/lib/api/content';
import { PORTFOLIO_CATEGORIES, PORTFOLIO_CATEGORY_LABEL, type PortfolioCategory } from '@/lib/api/content-model';
import { extractApiError } from '@/lib/api/result-codes';
import { useBoardQuery } from '@/components/site/board/useBoardQuery';
import BoardPagination from '@/components/site/board/BoardPagination';
import BoardSearch from '@/components/site/board/BoardSearch';

const PAGE_SIZE = 12;

const isCategory = (value: string | undefined): value is PortfolioCategory =>
  !!value && (PORTFOLIO_CATEGORIES as string[]).includes(value);

/** 포트폴리오 상세. 기존 사이트처럼 목록 위에 제목·설명·이미지·분류를 보여준다. */
function PortfolioDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, error, isLoading } = useSWR(['portfolio-detail', id], () => ContentService.portfolio(id));

  if (isLoading) return <p className="py-16 text-center text-[14px] text-[#999]">불러오는 중…</p>;
  if (error || !data) {
    return (
      <div className="py-16 text-center text-[14px] text-[#999]">
        {extractApiError(error, '포트폴리오를 찾을 수 없습니다.')}
        <div className="mt-4">
          <button type="button" onClick={onClose} className="border border-[#ccc] px-4 py-2 text-[13px]">
            목록
          </button>
        </div>
      </div>
    );
  }

  return (
    <article className="mb-16 border-t border-[#333]">
      <dl className="grid grid-cols-[120px_1fr] border-b border-[#ddd] text-[14px] md:grid-cols-[200px_1fr]">
        <dt className="bg-[#f5f5f5] px-4 py-3 text-center text-[#555]">제목</dt>
        <dd className="px-4 py-3 text-[#222]">{data.title}</dd>
      </dl>
      {data.description && <p className="px-2 pt-5 text-[16px] text-[#d32f2f]">- {data.description}</p>}
      {/* eslint-disable-next-line @next/next/no-img-element -- 정적 export 대상, 저장소 공개 URL */}
      <img src={data.imageUrl} alt={data.title} className="mt-6 w-full max-w-[720px] px-2" />
      <dl className="mt-10 grid grid-cols-[120px_1fr] border-y border-[#ddd] text-[14px] md:grid-cols-[200px_1fr]">
        <dt className="bg-[#f5f5f5] px-4 py-3 text-center text-[#555]">분류</dt>
        <dd className="px-4 py-3 text-[#222]">{PORTFOLIO_CATEGORY_LABEL[data.category]}</dd>
      </dl>
      <button type="button" onClick={onClose} className="mt-4 border border-[#ccc] px-4 py-2 text-[13px] hover:bg-[#f2f2f2]">
        목록
      </button>
    </article>
  );
}

/** 포트폴리오 게시판: 분류 버튼 · 4열 그리드 · 숫자 페이지 · 제목 검색. 상태는 URL 쿼리에 둔다. */
export default function PortfolioBoard() {
  const { get, page, update } = useBoardQuery();
  const boardRef = useRef<HTMLDivElement>(null);
  const rawCategory = get('category');
  const category = isCategory(rawCategory) ? rawCategory : undefined;
  const keyword = get('q');
  const selectedId = get('id');

  // 새 조건을 받는 동안 이전 목록을 유지해 높이가 줄었다 늘며 화면이 튀지 않게 한다.
  const { data, error, isLoading, isValidating } = useSWR(
    ['portfolios', category, keyword, page],
    () => ContentService.portfolios({ category, keyword, page, size: PAGE_SIZE }),
    { keepPreviousData: true },
  );
  const refreshing = isValidating && !!data;
  const go = (patch: Record<string, string | number | undefined>) => update(patch, { reveal: boardRef.current });

  const filterClass = (active: boolean) =>
    `min-w-[64px] border px-5 py-2.5 text-[13px] font-medium transition-colors ${
      active ? 'border-[#333] bg-[#333] text-white' : 'border-[#ccc] bg-white text-[#333] hover:border-[#333]'
    }`;

  return (
    <div ref={boardRef} className="[overflow-anchor:none]">
      {selectedId && <PortfolioDetail id={selectedId} onClose={() => go({ id: undefined })} />}

      <div className="mb-12 flex flex-wrap justify-center gap-2">
        <button type="button" className={filterClass(!category)} onClick={() => go({ category: undefined, page: 0, id: undefined })}>
          ALL
        </button>
        {PORTFOLIO_CATEGORIES.map((value) => (
          <button
            key={value}
            type="button"
            className={filterClass(category === value)}
            onClick={() => go({ category: value, page: 0, id: undefined })}
          >
            {PORTFOLIO_CATEGORY_LABEL[value]}
          </button>
        ))}
      </div>

      {isLoading && !data && <p className="py-20 text-center text-[14px] text-[#999]">불러오는 중…</p>}
      {error && <p className="py-20 text-center text-[14px] text-[#999]">{extractApiError(error, '포트폴리오를 불러오지 못했습니다.')}</p>}
      {data && data.content.length === 0 && <p className="py-20 text-center text-[14px] text-[#999]">등록된 포트폴리오가 없습니다.</p>}

      {data && data.content.length > 0 && (
        <ul
          aria-busy={refreshing}
          className={`grid grid-cols-2 gap-x-5 gap-y-8 transition-opacity md:grid-cols-3 lg:grid-cols-4 lg:gap-x-8 ${refreshing ? 'opacity-60' : ''}`}
        >
          {data.content.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => go({ id: item.id })} className="group block w-full text-center">
                <span className="block aspect-[1.85/1] overflow-hidden bg-[#f2f2f2]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- 정적 export 대상, 저장소 공개 URL */}
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </span>
                <span className="mt-3 block truncate text-[14px] font-medium text-[#222] md:text-[15px]">{item.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 border-t border-[#ddd]">
        <BoardPagination page={page} totalPages={data?.totalPages ?? 0} onChange={(p) => go({ page: p, id: undefined })} />
        <BoardSearch
          options={[{ value: 'TITLE', label: '제목' }]}
          key={keyword ?? ''}
          initialField="TITLE"
          initialKeyword={keyword}
          onSearch={(_, q) => go({ q, page: 0, id: undefined })}
        />
      </div>
    </div>
  );
}
