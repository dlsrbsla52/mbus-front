'use client';

interface BoardPaginationProps {
  /** 0부터 시작하는 현재 페이지 */
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

const WINDOW = 10;

/** 기존 사이트 게시판의 숫자 페이지(10개 단위 묶음). */
export default function BoardPagination({ page, totalPages, onChange }: BoardPaginationProps) {
  if (totalPages <= 1) return null;
  const start = Math.floor(page / WINDOW) * WINDOW;
  const end = Math.min(start + WINDOW, totalPages);
  const pages = Array.from({ length: end - start }, (_, i) => start + i);

  const arrowClass = 'px-2 text-[13px] text-[#999] hover:text-[#111]';

  return (
    <nav className="flex items-center justify-center gap-1 py-6" aria-label="페이지">
      {start > 0 && (
        <button type="button" className={arrowClass} onClick={() => onChange(start - 1)} aria-label="이전 페이지 묶음">
          ‹
        </button>
      )}
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
          className={`min-w-6 px-1 text-[15px] ${p === page ? 'font-bold text-[#111]' : 'text-[#666] hover:text-[#111]'}`}
        >
          {p + 1}
        </button>
      ))}
      {end < totalPages && (
        <button type="button" className={arrowClass} onClick={() => onChange(end)} aria-label="다음 페이지 묶음">
          ›
        </button>
      )}
    </nav>
  );
}
