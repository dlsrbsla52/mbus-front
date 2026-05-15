import React from "react";
import Link from "next/link";
import { Share2, Globe, PlayCircle, Phone, Mail, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-brand-black text-white pt-16 pb-12">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 pb-12 border-b border-gray-800">
          {/* Company Info */}
          <div className="space-y-6">
            <Link href="/" className="inline-block">
              <span className="text-2xl font-bold tracking-tighter">
                MEDIA<span className="text-brand-blue">BUS</span>
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              최고의 기술과 창의적인 아이디어로 디지털 미디어 시대를 선도하는 미디어버스입니다.
            </p>
            <div className="flex space-x-4">
              <Link href="#" className="p-2 bg-gray-900 rounded-full hover:bg-brand-blue transition-colors">
                <Share2 size={18} />
              </Link>
              <Link href="#" className="p-2 bg-gray-900 rounded-full hover:bg-brand-blue transition-colors">
                <Globe size={18} />
              </Link>
              <Link href="#" className="p-2 bg-gray-900 rounded-full hover:bg-brand-blue transition-colors">
                <PlayCircle size={18} />
              </Link>
            </div>
          </div>


          {/* Site Map 1 */}
          <div>
            <h4 className="text-lg font-bold mb-6">회사소개</h4>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li><Link href="#" className="hover:text-white transition-colors">미디어버스 소식</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">연혁 및 실적</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">찾아오시는 길</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">채용안내</Link></li>
            </ul>
          </div>

          {/* Site Map 2 */}
          <div>
            <h4 className="text-lg font-bold mb-6">주요서비스</h4>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li><Link href="#" className="hover:text-white transition-colors">디지털 마케팅</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">컨텐츠 제작</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">시스템 통합(SI)</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">클라우드 솔루션</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-bold mb-6">고객센터</h4>
            <ul className="space-y-4 text-gray-400 text-sm">
              <li className="flex items-center space-x-3">
                <Phone size={16} className="text-brand-blue" />
                <span>02-123-4567</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail size={16} className="text-brand-blue" />
                <span>contact@mediabus.co.kr</span>
              </li>
              <li className="flex items-start space-x-3">
                <MapPin size={16} className="text-brand-blue flex-shrink-0 mt-1" />
                <span>서울특별시 강남구 테헤란로 123, 미디어버스 빌딩 15층</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="mt-12 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 space-y-4 md:space-y-0">
          <div className="flex items-center space-x-6">
            <span>© 2024 MEDIABUS. All rights reserved.</span>
            <Link href="#" className="hover:text-white transition-colors">이용약관</Link>
            <Link href="#" className="hover:text-white transition-colors font-bold">개인정보처리방침</Link>
          </div>
          <div className="flex space-x-4">
            <span className="text-gray-600">사업자등록번호: 123-45-67890</span>
            <span className="text-gray-600">대표이사: 홍길동</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
