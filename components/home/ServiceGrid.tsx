import React from "react";
import Link from "next/link";
import { ArrowRight, Monitor, Layout, Cloud, ShieldCheck } from "lucide-react";
import Section from "@/components/common/Section";
import { SERVICE_ITEMS } from "@/constants/navigation";

const ICON_MAP: Record<string, React.ReactNode> = {
  Monitor: <Monitor className="w-10 h-10" />,
  Layout: <Layout className="w-10 h-10" />,
  Cloud: <Cloud className="w-10 h-10" />,
  ShieldCheck: <ShieldCheck className="w-10 h-10" />,
};

const ServiceGrid = () => {
  return (
    <Section className="bg-white">
      <div className="text-center mb-20 space-y-4">
        <h2 className="text-3xl md:text-5xl font-black tracking-tight text-brand-black">Our Core Services</h2>
        <div className="w-20 h-1.5 bg-brand-blue mx-auto" />
        <p className="text-gray-500 max-w-2xl mx-auto text-lg font-medium">
          미디어버스가 제공하는 핵심 서비스는 고객사의 비즈니스 성장과 디지털 고도화를 목표로 합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {SERVICE_ITEMS.map((service) => (
          <div 
            key={service.id} 
            className="p-10 rounded-3xl bg-gray-50 hover:bg-white hover:shadow-2xl transition-all duration-500 border border-transparent hover:border-gray-100 group flex flex-col items-center text-center"
          >
            <div className="text-brand-blue mb-8 transform group-hover:scale-110 transition-transform duration-500">
              {ICON_MAP[service.icon]}
            </div>
            <h3 className="text-2xl font-bold mb-4 text-brand-black">{service.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-8 flex-grow font-medium">
              {service.desc}
            </p>
            <Link href="#" className="text-sm font-black flex items-center gap-1 text-gray-400 group-hover:text-brand-blue transition-colors">
              READ MORE <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        ))}
      </div>
    </Section>
  );
};

export default ServiceGrid;
