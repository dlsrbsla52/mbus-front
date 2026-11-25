'use client';

import type { ReactNode } from 'react';
import { SWRConfig, type SWRConfiguration } from 'swr';

const MAX_RETRY = 3;

const statusOf = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } } | null)?.response?.status;

/** 공개 사이트 공통 SWR 설정: 4xx는 다시 시도해도 같으므로 멈추고, 그 밖의 오류만 최대 3번 늘려 가며 재시도한다. */
const onErrorRetry: NonNullable<SWRConfiguration['onErrorRetry']> = (error, _key, _config, revalidate, { retryCount }) => {
  const status = statusOf(error);
  if (status !== undefined && status >= 400 && status < 500) return;
  if (retryCount >= MAX_RETRY) return;
  setTimeout(() => void revalidate({ retryCount }), 2000 * 2 ** retryCount);
};

export default function SiteSWRConfig({ children }: { children: ReactNode }) {
  return <SWRConfig value={{ onErrorRetry }}>{children}</SWRConfig>;
}
