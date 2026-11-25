'use client';

import type { ReactNode } from 'react';
import { extractApiError } from '@/lib/api/result-codes';

/** 서버 오류는 응답 메시지, 브라우저 단계(변환·업로드) 오류는 예외 메시지를 보여준다. */
export const errorText = (error: unknown, fallback: string) =>
  extractApiError(error, error instanceof Error && error.message ? error.message : fallback);

/** 너비를 따로 지정하는 입력(검색창·선택 상자 등). `inputClass`는 여기에 `w-full`을 더한 것이다. */
export const fieldClass =
  'rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none';

export const inputClass = `${fieldClass} w-full`;

export const primaryButton =
  'rounded-md bg-brand-black px-4 py-2 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-40';

export const secondaryButton =
  'rounded-md border border-brand-gray-200 bg-white px-4 py-2 text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50 disabled:opacity-40';

export const dangerButton =
  'rounded-md border border-danger/30 bg-white px-4 py-2 text-sm font-semibold text-danger hover:bg-danger-soft disabled:opacity-40';

export function VisibilityBadge({ visible }: { visible: boolean }) {
  return visible ? (
    <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success">노출</span>
  ) : (
    <span className="rounded-full bg-brand-gray-100 px-2.5 py-0.5 text-xs font-semibold text-brand-gray-500">숨김</span>
  );
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{children}</p>;
}

/** 순서 편집 목록: 위·아래로 옮기거나 맨 위로 올린다. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
