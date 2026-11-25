'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const MAX_PAGE = 1_000_000;
const GAP_BELOW_HEADER = 16;

/**
 * 게시판 상단이 화면에서 벗어나 있을 때만 그 위치로 스크롤한다(고정 헤더 높이만큼 띄운다).
 * 이미 보이는 위치면 그대로 둬서, 분류 버튼처럼 눈앞에서 누른 동작이 화면을 흔들지 않게 한다.
 * 게시판 요소에는 `overflow-anchor: none`을 준다. 그러지 않으면 상세가 닫힐 때 브라우저 스크롤 앵커링이
 * 아래 목록을 제자리에 두려고 화면을 끌어올려, 긴 화면(태블릿·데스크톱)에서 맨 위로 튄다.
 */
export function revealBoardTop(element: HTMLElement | null) {
  if (!element) return;
  const headerHeight = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
  const top = element.getBoundingClientRect().top;
  const visible = top >= headerHeight && top <= window.innerHeight * 0.5;
  if (visible) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: window.scrollY + top - headerHeight - GAP_BELOW_HEADER, behavior: reduceMotion ? 'auto' : 'smooth' });
}

/** 게시판 상태(페이지·검색어·분류 등)를 URL 쿼리로 관리한다. 뒤로가기·새로고침·링크 공유에서 상태가 유지된다. */
export function useBoardQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = useCallback((key: string) => searchParams.get(key) ?? undefined, [searchParams]);

  const rawPage = Math.floor(Number(searchParams.get('page') ?? '0'));
  const page = Number.isFinite(rawPage) ? Math.min(MAX_PAGE, Math.max(0, rawPage)) : 0;

  /**
   * 쿼리를 바꾼다. 페이지 맨 위로 튀지 않도록 스크롤은 하지 않고,
   * `reveal`을 넘기면 그 요소(게시판 상단)가 화면 밖일 때만 그 위치로 옮긴다.
   */
  const update = useCallback(
    (patch: Record<string, string | number | undefined>, options: { reveal?: HTMLElement | null } = {}) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined || value === '' || (key === 'page' && value === 0)) next.delete(key);
        else next.set(key, String(value));
      });
      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
      if (options.reveal) {
        const target = options.reveal;
        requestAnimationFrame(() => revealBoardTop(target));
      }
    },
    [pathname, router, searchParams],
  );

  return { get, page, update };
}
