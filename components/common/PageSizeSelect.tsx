'use client';

/** 목록 페이지에서 공통으로 쓰는 페이지당 행 수 선택지. */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200] as const;
/** 기본 페이지 크기. */
export const DEFAULT_PAGE_SIZE = 20;

interface PageSizeSelectProps {
  /** 현재 선택된 페이지 크기. */
  value: number;
  /** 새 페이지 크기 선택 시 호출. (페이지를 0으로 리셋하는 책임은 호출 측에 있다.) */
  onChange: (size: number) => void;
  /** 선택지 목록. 기본 [10, 20, 50, 100, 200]. */
  options?: readonly number[];
  /** 앞에 붙는 라벨. 기본 "페이지당". */
  label?: string;
  /** 래퍼 label 에 추가할 클래스. */
  className?: string;
}

/**
 * 페이지당 행 수 선택 드롭다운. 목록(DataTable + Pagination) 화면에서 공통 사용.
 */
export default function PageSizeSelect({
  value,
  onChange,
  options = PAGE_SIZE_OPTIONS,
  label = '페이지당',
  className,
}: PageSizeSelectProps) {
  return (
    <label className={`flex items-center gap-2 text-xs text-brand-gray-500 ${className ?? ''}`}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-md border border-brand-gray-200 bg-white px-2 py-2 text-sm text-brand-gray-700 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
      >
        {options.map((n) => (
          <option key={n} value={n}>
            {n}개
          </option>
        ))}
      </select>
    </label>
  );
}
