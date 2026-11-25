'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Pause, Play } from 'lucide-react';
import { HOME_SLIDES } from '@/constants/site';

const INTERVAL_MS = 6000;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** 메인 비주얼 슬라이더. 기존 사이트처럼 6초마다 페이드로 넘어가고 점 버튼으로 이동한다. */
export default function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [manualPlay, setManualPlay] = useState<boolean | null>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
  const playing = manualPlay ?? !reducedMotion;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setCurrent((index) => (index + 1) % HOME_SLIDES.length), INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [current, playing]);

  return (
    <section className="relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-[#111]" aria-roledescription="carousel">
      {HOME_SLIDES.map((slide, index) => (
        <div
          key={slide.image}
          role="img"
          aria-label={slide.alt}
          aria-hidden={index !== current}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[1500ms] ${
            index === current ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ backgroundImage: `url(${slide.image})` }}
        />
      ))}

      <div className="absolute left-4 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-3 md:left-8">
        {HOME_SLIDES.map((slide, index) => (
          <button
            key={slide.image}
            type="button"
            onClick={() => setCurrent(index)}
            aria-label={`${index + 1}번째 슬라이드`}
            aria-current={index === current}
            className={`h-2 w-2 rounded-full transition-colors ${index === current ? 'bg-white' : 'bg-white/40'}`}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setManualPlay(!playing)}
        aria-label={playing ? '슬라이드 자동 재생 정지' : '슬라이드 자동 재생 시작'}
        className="absolute bottom-10 left-4 z-10 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 md:left-8"
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>

      <div className="absolute bottom-10 right-6 z-10 hidden flex-col items-center gap-2 text-[11px] text-white/80 md:flex">
        <span className="h-10 w-px animate-pulse bg-white/70" />
        Scroll
      </div>
    </section>
  );
}
