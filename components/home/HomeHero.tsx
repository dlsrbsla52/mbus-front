import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const HomeHero = () => {
  return (
    <section className="relative h-[90vh] w-full flex items-center justify-center overflow-hidden bg-brand-black">
      {/* Background Overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-black/50 z-10" />
        <div 
          className="w-full h-full bg-cover bg-center" 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80')" }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-20 text-center text-white">
        <span className="inline-block px-4 py-1 rounded-full bg-brand-blue/20 border border-brand-blue/30 text-brand-blue text-sm font-bold mb-6">
          Digital Transformation Partner
        </span>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-8 leading-tight tracking-tighter">
          미래를 연결하는 <br />
          <span className="text-brand-blue">디지털 미디어</span> 엔진
        </h1>
        <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
          미디어버스는 최고의 기술력과 창의력을 결합하여 비즈니스의 새로운 가능성을 창조합니다. 
          우리는 단순한 솔루션을 넘어 가치를 제공합니다.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/portfolio" 
            className="px-10 py-4 bg-brand-blue hover:bg-blue-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 flex items-center gap-2 group"
          >
            포트폴리오 보기 <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            href="/contact" 
            className="px-10 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg backdrop-blur-md border border-white/20 transition-all"
          >
            상담 요청하기
          </Link>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 animate-bounce">
          <div className="w-[1px] h-12 bg-gradient-to-b from-white to-transparent mx-auto"></div>
      </div>
    </section>
  );
};

export default HomeHero;
