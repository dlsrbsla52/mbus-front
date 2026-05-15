import HomeHero from "@/components/home/HomeHero";
import ServiceGrid from "@/components/home/ServiceGrid";

export default function Home() {
  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <HomeHero />

      {/* Service Grid Section */}
      <ServiceGrid />

      {/* 추가 섹션들이 들어올 자리 (예: Portfolio, News 등) */}
    </div>
  );
}


