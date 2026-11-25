import { HOME_VIDEO_ID } from '@/constants/site';

/** "Our Commitment" 소개 문구와 홍보 영상. */
export default function CommitmentSection() {
  return (
    <section className="bg-white py-20 md:py-[130px]">
      <div className="mx-auto max-w-[1430px] px-[15px]">
        <p className="text-[14px] font-medium text-site-navy md:text-[16px]">Our Commitment</p>
        <h2 className="mt-2 text-[28px] font-bold tracking-tight text-[#111] md:text-[40px]">SEOUL BUS STOP ADVERTISING</h2>
        <p className="mt-5 text-[14px] text-[#333] md:text-[17px]">서울 대중 교통 광고의 새로운 기준, 서울 버스 TV BUS STOP AD.</p>

        <div className="relative mt-12 w-full overflow-hidden pt-[50%] md:mt-[100px]">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${HOME_VIDEO_ID}`}
            title="미디어버스 소개 영상"
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}
