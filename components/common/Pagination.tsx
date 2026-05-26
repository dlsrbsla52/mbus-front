'use client';

interface PaginationProps {
  /** 0-based page index matching backend PageResult. */
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  /** Number of sibling page buttons around the active page. */
  siblings?: number;
}

export default function Pagination({ page, totalPages, onChange, siblings = 1 }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPageList(page, totalPages, siblings);
  const goto = (p: number) => {
    if (p < 0 || p >= totalPages || p === page) return;
    onChange(p);
  };

  return (
    <nav className="flex items-center justify-center gap-1 py-4" aria-label="페이지네이션">
      <button
        type="button"
        onClick={() => goto(page - 1)}
        disabled={page === 0}
        className="rounded-md border border-brand-gray-200 px-3 py-1.5 text-sm text-brand-gray-600 hover:bg-brand-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        이전
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-2 text-sm text-brand-gray-400">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => goto(p)}
            aria-current={p === page ? 'page' : undefined}
            className={
              p === page
                ? 'rounded-md bg-brand-black px-3 py-1.5 text-sm font-semibold text-white'
                : 'rounded-md border border-brand-gray-200 px-3 py-1.5 text-sm text-brand-gray-700 hover:bg-brand-gray-50'
            }
          >
            {p + 1}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => goto(page + 1)}
        disabled={page >= totalPages - 1}
        className="rounded-md border border-brand-gray-200 px-3 py-1.5 text-sm text-brand-gray-600 hover:bg-brand-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        다음
      </button>
    </nav>
  );
}

function buildPageList(page: number, total: number, siblings: number): (number | '…')[] {
  const out: (number | '…')[] = [];
  const start = Math.max(0, page - siblings);
  const end = Math.min(total - 1, page + siblings);

  if (start > 0) {
    out.push(0);
    if (start > 1) out.push('…');
  }
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) {
    if (end < total - 2) out.push('…');
    out.push(total - 1);
  }
  return out;
}
