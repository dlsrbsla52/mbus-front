import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <h1 className="text-8xl font-black text-brand-blue mb-4">404</h1>
      <h2 className="text-3xl font-bold text-brand-black mb-6">요청하신 페이지를 찾을 수 없습니다.</h2>
      <p className="text-gray-500 max-w-md mb-12">
        입력하신 주소가 정확한지 확인해 주세요. <br />
        또는 아래 버튼을 눌러 메인 페이지로 돌아가실 수 있습니다.
      </p>
      <Link
        href="/"
        className="px-10 py-4 bg-brand-black hover:bg-brand-blue text-white font-bold rounded-lg transition-all flex items-center gap-2"
      >
        <Home size={20} /> 메인으로 돌아가기
      </Link>
    </div>
  );
}
