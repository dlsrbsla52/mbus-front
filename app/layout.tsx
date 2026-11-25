import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import SiteChrome from "@/components/layout/SiteChrome";
import AuthGate from "@/components/auth/AuthGate";

const notoHighlight = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "미디어버스 ｜ 서울버스TV 정류장 안내 광고",
  description: "버스 내부TV 광고 | 정류장 도착 안내 광고·디지털사이니지 미디어버스",
  keywords: ["미디어버스", "서울버스TV", "정류장 안내 광고", "버스 내부TV 광고", "디지털사이니지"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${notoHighlight.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-noto">
        <AuthGate>
          <SiteChrome>{children}</SiteChrome>
        </AuthGate>
      </body>
    </html>
  );
}

