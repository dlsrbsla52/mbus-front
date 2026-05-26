import { NextResponse, type NextRequest } from 'next/server';

/**
 * NEXT_PUBLIC_ADMIN_HOST 가 설정되고 요청 호스트와 일치하면
 * 모든 경로를 /manager/* 로 rewrite 한다.
 *
 * 사용 예: admin.mbus.kr 을 동일 Next.js 앱에 매핑하면
 * https://admin.mbus.kr/foo → 내부 라우트 /manager/foo
 *
 * 변수가 비어 있으면 동작하지 않으므로 v1 은 일반 /manager/* 경로만 사용한다.
 */
export function proxy(req: NextRequest) {
  const adminHost = process.env.NEXT_PUBLIC_ADMIN_HOST;
  if (!adminHost) return;

  const host = req.headers.get('host')?.toLowerCase();
  if (host !== adminHost.toLowerCase()) return;

  const url = req.nextUrl.clone();
  if (url.pathname.startsWith('/manager')) return;

  url.pathname = url.pathname === '/' ? '/manager' : `/manager${url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico|api).*)',
};
