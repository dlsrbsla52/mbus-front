import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

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
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

