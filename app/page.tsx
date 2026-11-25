import HeroSlider from '@/components/home/HeroSlider';
import CommitmentSection from '@/components/home/CommitmentSection';
import PartnersSection from '@/components/home/PartnersSection';
import CompanySection from '@/components/home/CompanySection';
import CustomerSection from '@/components/home/CustomerSection';
import SiteSWRConfig from '@/components/site/SiteSWRConfig';

/** 홈. 기존 mbus.co.kr 메인과 같은 순서로 구성한다. */
export default function Home() {
  return (
    <SiteSWRConfig>
      <div className="flex w-full flex-col">
        <HeroSlider />
        <CommitmentSection />
        <PartnersSection />
        <CompanySection />
        <CustomerSection />
      </div>
    </SiteSWRConfig>
  );
}
