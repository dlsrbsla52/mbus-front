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
  title: "미디어버스 ｜ MEDIA BUS",
  description: "미디어버스 - 최고의 디지털 솔루션 파트너",
  keywords: ["미디어버스", "디지털마케팅", "컨텐츠제작", "SI", "클라우드"],
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

